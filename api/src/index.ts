// Midnight Counter API Implementation
// SPDX-License-Identifier: Apache-2.0

import * as CounterContract from '../../contract/src/managed/counter/contract/index.js';
import { type ContractAddress, convertFieldToBytes } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import {
  type CounterDerivedState,
  type CounterContract as CounterContractType,
  type CounterProviders,
  type DeployedCounterContract,
  counterPrivateStateKey,
} from './common-types.js';
import { CompiledCounterContractContract } from '../../contract/src/index.js';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, tap, from, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { CounterPrivateState, createCounterPrivateState } from '../../contract/src/witnesses.js';

export interface DeployedCounterAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<CounterDerivedState>;

  increment: () => Promise<void>;
  incrementByPrivateAmount: (amount: bigint) => Promise<void>;
  reset: () => Promise<void>;
}

export class CounterAPI implements DeployedCounterAPI {
  private constructor(
    public readonly deployedContract: DeployedCounterContract,
    private readonly providers: CounterProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);

    this.state$ = combineLatest(
      [
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => CounterContract.ledger(contractState.data)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                count: ledgerState.count.toString(),
                totalOperations: ledgerState.totalOperations.toString(),
                lastActor: toHex(ledgerState.lastActor),
              },
            }),
          ),
        ),
        from(providers.privateStateProvider.get(counterPrivateStateKey) as Promise<CounterPrivateState>),
      ],
      (ledgerState, privateState) => {
        const hashedSecretKey = CounterContract.pureCircuits.publicKey(
          privateState.secretKey,
          convertFieldToBytes(32, ledgerState.count, 'api/src/index.ts'),
        );

        return {
          count: ledgerState.count,
          totalOperations: ledgerState.totalOperations,
          lastActor: toHex(ledgerState.lastActor),
          isOwner: toHex(ledgerState.lastActor) === toHex(hashedSecretKey),
        };
      },
    );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<CounterDerivedState>;

  async increment(): Promise<void> {
    this.logger?.info('incrementing counter by 1');
    const txData = await this.deployedContract.callTx.increment();
    this.logger?.trace({
      transactionAdded: {
        circuit: 'increment',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async incrementByPrivateAmount(amount: bigint): Promise<void> {
    this.logger?.info(`incrementing counter by private amount: ${amount}`);
    const existingPrivateState = await this.providers.privateStateProvider.get(counterPrivateStateKey);
    const updatedPrivateState = createCounterPrivateState(
      existingPrivateState?.secretKey ?? utils.randomBytes(32),
      amount,
    );
    await this.providers.privateStateProvider.set(counterPrivateStateKey, updatedPrivateState);

    const txData = await this.deployedContract.callTx.incrementByPrivateAmount();
    this.logger?.trace({
      transactionAdded: {
        circuit: 'incrementByPrivateAmount',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async reset(): Promise<void> {
    this.logger?.info('resetting counter');
    const txData = await this.deployedContract.callTx.reset();
    this.logger?.trace({
      transactionAdded: {
        circuit: 'reset',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  static async deploy(providers: CounterProviders, logger?: Logger): Promise<CounterAPI> {
    logger?.info('deploying Counter contract');
    const deployedCounterContract = await deployContract(providers, {
      compiledContract: CompiledCounterContractContract,
      privateStateId: counterPrivateStateKey,
      initialPrivateState: createCounterPrivateState(utils.randomBytes(32), 1n),
    });

    logger?.trace({
      contractDeployed: {
        finalizedDeployTxData: deployedCounterContract.deployTxData.public,
      },
    });

    return new CounterAPI(deployedCounterContract, providers, logger);
  }

  static async join(
    providers: CounterProviders,
    contractAddress: ContractAddress,
    logger?: Logger,
  ): Promise<CounterAPI> {
    logger?.info({
      joinContract: {
        contractAddress,
      },
    });

    const deployedCounterContract = await findDeployedContract<CounterContractType>(providers, {
      contractAddress,
      compiledContract: CompiledCounterContractContract,
      privateStateId: counterPrivateStateKey,
      initialPrivateState: await CounterAPI.getPrivateState(providers, contractAddress),
    });

    logger?.trace({
      contractJoined: {
        finalizedDeployTxData: deployedCounterContract.deployTxData.public,
      },
    });

    return new CounterAPI(deployedCounterContract, providers, logger);
  }

  private static async getPrivateState(
    providers: CounterProviders,
    contractAddress: ContractAddress,
  ): Promise<CounterPrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existingPrivateState = await providers.privateStateProvider.get(counterPrivateStateKey);
    return existingPrivateState ?? createCounterPrivateState(utils.randomBytes(32), 1n);
  }
}

export * as utils from './utils/index.js';
export * from './common-types.js';
