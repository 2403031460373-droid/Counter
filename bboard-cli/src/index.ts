// Midnight Counter CLI Entry Point
// SPDX-License-Identifier: Apache-2.0

import { createInterface, type Interface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { WebSocket } from 'ws';
import {
  CounterAPI,
  type CounterDerivedState,
  counterPrivateStateKey,
  type CounterProviders,
  type DeployedCounterContract,
  type PrivateStateId,
} from '../../api/src/index.js';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ledger, type Ledger } from '../../contract/src/managed/counter/contract/index.js';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { type Logger } from 'pino';
import { type Config, StandaloneConfig } from './config.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { MidnightWalletProvider } from './midnight-wallet-provider.js';
import { randomBytes } from '../../api/src/utils/index.js';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils.js';
import { generateDust } from './generate-dust.js';
import { CounterPrivateState } from '../../contract/src/witnesses.js';

// @ts-expect-error: Enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

export const getCounterLedgerState = async (
  providers: CounterProviders,
  contractAddress: ContractAddress,
): Promise<Ledger | null> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null ? ledger(contractState.data) : null;
};

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new Counter contract
  2. Join an existing Counter contract
  3. Exit
Which would you like to do? `;

const deployOrJoin = async (
  providers: CounterProviders,
  rli: Interface,
  logger: Logger,
): Promise<CounterAPI | null> => {
  let api: CounterAPI | null = null;

  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1':
        api = await CounterAPI.deploy(providers, logger);
        logger.info(`Deployed contract at address: ${api.deployedContractAddress}`);
        return api;
      case '2':
        api = await CounterAPI.join(providers, await rli.question('What is the contract address (in hex)? '), logger);
        logger.info(`Joined contract at address: ${api.deployedContractAddress}`);
        return api;
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const displayLedgerState = async (
  providers: CounterProviders,
  deployedCounterContract: DeployedCounterContract,
  logger: Logger,
): Promise<void> => {
  const contractAddress = deployedCounterContract.deployTxData.public.contractAddress;
  const ledgerState = await getCounterLedgerState(providers, contractAddress);
  if (ledgerState === null) {
    logger.info(`There is no Counter contract deployed at ${contractAddress}`);
  } else {
    logger.info(`Current count: ${ledgerState.count}`);
    logger.info(`Total operations: ${ledgerState.totalOperations}`);
    logger.info(`Last actor hash: '${toHex(ledgerState.lastActor)}'`);
  }
};

const displayPrivateState = async (providers: CounterProviders, logger: Logger): Promise<void> => {
  const privateState = await providers.privateStateProvider.get(counterPrivateStateKey);
  if (privateState === null) {
    logger.info(`There is no existing Counter private state`);
  } else {
    logger.info(`Current secret key: ${toHex(privateState.secretKey)}`);
    logger.info(`Current secret amount: ${privateState.secretAmount}`);
  }
};

const displayDerivedState = (ledgerState: CounterDerivedState | undefined, logger: Logger) => {
  if (ledgerState === undefined) {
    logger.info(`No Counter state currently available`);
  } else {
    logger.info(`Current count: ${ledgerState.count}`);
    logger.info(`Total operations: ${ledgerState.totalOperations}`);
    logger.info(`Last actor hash: ${ledgerState.lastActor}`);
    logger.info(`Is last actor you? ${ledgerState.isOwner ? 'YES' : 'NO'}`);
  }
};

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Public Increment (+1)
  2. Private Step Increment (ZK Private Amount)
  3. Reset Counter
  4. Display Ledger State (Public)
  5. Display Private State (Local ZK Witness)
  6. Display Derived State
  7. Exit
Which would you like to do? `;

const mainLoop = async (providers: CounterProviders, rli: Interface, logger: Logger): Promise<void> => {
  const counterApi = await deployOrJoin(providers, rli, logger);
  if (counterApi === null) {
    return;
  }
  let currentState: CounterDerivedState | undefined;
  const stateObserver = {
    next: (state: CounterDerivedState) => (currentState = state),
  };
  const subscription = counterApi.state$.subscribe(stateObserver);
  try {
    while (true) {
      const choice = await rli.question(MAIN_LOOP_QUESTION);
      try {
        switch (choice) {
          case '1': {
            await counterApi.increment();
            break;
          }
          case '2': {
            const amountStr = await rli.question(`Enter private increment amount (1-100): `);
            const amount = BigInt(amountStr || '1');
            await counterApi.incrementByPrivateAmount(amount);
            break;
          }
          case '3':
            await counterApi.reset();
            break;
          case '4':
            await displayLedgerState(providers, counterApi.deployedContract, logger);
            break;
          case '5':
            await displayPrivateState(providers, logger);
            break;
          case '6':
            displayDerivedState(currentState, logger);
            break;
          case '7':
            logger.info('Exiting...');
            return;
          default:
            logger.error(`Invalid choice: ${choice}`);
        }
      } catch (e) {
        logError(logger, e);
        logger.info('Returning to main menu...');
      }
    }
  } finally {
    subscription.unsubscribe();
  }
};

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface, logger: Logger): Promise<string | undefined> => {
  if (config instanceof StandaloneConfig) {
    return GENESIS_MINT_WALLET_SEED;
  }
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1':
        return toHex(randomBytes(32));
      case '2':
        return await rli.question('Enter your wallet seed: ');
      case '3':
        logger.info('Exiting...');
        return undefined;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

export const run = async (config: Config, testEnv: TestEnvironment, logger: Logger): Promise<void> => {
  const rli = createInterface({ input, output, terminal: true });
  const providersToBeStopped: MidnightWalletProvider[] = [];
  try {
    const envConfiguration = await testEnv.start();
    logger.info(`Environment started with configuration: ${JSON.stringify(envConfiguration)}`);
    const seed = await buildWallet(config, rli, logger);
    if (seed === undefined) {
      return;
    }
    const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
    providersToBeStopped.push(walletProvider);
    const walletFacade: WalletFacade = walletProvider.wallet;

    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletFacade, envConfiguration, unshieldedToken());
    const nightBalance = unshieldedState.balances[unshieldedToken().raw];
    if (nightBalance === undefined) {
      logger.info('No funds received, exiting...');
      return;
    }
    logger.info(`Your NIGHT wallet balance is: ${nightBalance}`);

    if (config.generateDust) {
      const dustGeneration = await generateDust(logger, seed, unshieldedState, walletFacade);
      if (dustGeneration) {
        logger.info(`Submitted dust generation registration transaction: ${dustGeneration}`);
        await syncWallet(logger, walletFacade);
      }
    }

    const zkConfigProvider = new NodeZkConfigProvider<'increment' | 'incrementByPrivateAmount' | 'reset'>(
      config.zkConfigPath,
    );
    const providers: CounterProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, CounterPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => {
          return 'Counter-Test-2026!';
        },
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
      zkConfigProvider: zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };
    await mainLoop(providers, rli, logger);
  } catch (e) {
    logError(logger, e);
    logger.info('Exiting...');
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logError(logger, e);
    } finally {
      try {
        for (const wallet of providersToBeStopped) {
          logger.info('Stopping wallet...');
          await wallet.stop();
        }
        if (testEnv) {
          logger.info('Stopping test environment...');
          await testEnv.shutdown();
        }
      } catch (e) {
        logError(logger, e);
      }
    }
  }
};

function logError(logger: Logger, e: unknown) {
  if (e instanceof Error) {
    logger.error(`Found error '${e.message}'`);
    logger.debug(`${e.stack}`);
  } else {
    logger.error(`Found error (unknown type)`);
  }
}
