// Midnight Counter Contract Test Simulator
// SPDX-License-Identifier: Apache-2.0

import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  convertFieldToBytes,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
} from "../managed/counter/contract/index.js";
import { type CounterPrivateState, witnesses } from "../witnesses.js";

/**
 * Serves as a testbed to exercise the Counter contract in tests.
 */
export class CounterSimulator {
  readonly contract: Contract<CounterPrivateState>;
  circuitContext: CircuitContext<CounterPrivateState>;

  constructor(secretKey: Uint8Array, secretAmount: bigint = 1n) {
    this.contract = new Contract<CounterPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext({ secretKey, secretAmount }, "0".repeat(64)),
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  /***
   * Switch to a different secret key (and optionally amount) for a different user.
   */
  public switchUser(secretKey: Uint8Array, secretAmount: bigint = 1n) {
    this.circuitContext.currentPrivateState = {
      secretKey,
      secretAmount,
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): CounterPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public increment(): Ledger {
    this.circuitContext = this.contract.impureCircuits.increment(
      this.circuitContext,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public incrementByPrivateAmount(): Ledger {
    this.circuitContext = this.contract.impureCircuits.incrementByPrivateAmount(
      this.circuitContext,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public reset(): Ledger {
    this.circuitContext = this.contract.impureCircuits.reset(
      this.circuitContext,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public publicKey(countState: bigint): Uint8Array {
    const countBytes = convertFieldToBytes(
      32,
      countState,
      "counter-simulator.ts",
    );
    return this.contract.circuits.publicKey(
      this.circuitContext,
      this.getPrivateState().secretKey,
      countBytes,
    ).result;
  }
}
