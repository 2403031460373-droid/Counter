// Midnight Counter Contract Tests
// SPDX-License-Identifier: Apache-2.0

import { CounterSimulator } from "./counter-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";

setNetworkId("undeployed");

describe("Counter smart contract", () => {
  it("generates initial ledger state deterministically", () => {
    const key = randomBytes(32);
    const simulator0 = new CounterSimulator(key);
    const simulator1 = new CounterSimulator(key);
    expect(simulator0.getLedger()).toEqual(simulator1.getLedger());
  });

  it("properly initializes ledger state and private state", () => {
    const key = randomBytes(32);
    const simulator = new CounterSimulator(key, 5n);
    const initialLedgerState = simulator.getLedger();
    expect(initialLedgerState.count).toEqual(0n);
    expect(initialLedgerState.totalOperations).toEqual(0n);
    expect(initialLedgerState.lastActor).toEqual(new Uint8Array(32));
    const initialPrivateState = simulator.getPrivateState();
    expect(initialPrivateState).toEqual({ secretKey: key, secretAmount: 5n });
  });

  it("lets you increment the counter by 1", () => {
    const simulator = new CounterSimulator(randomBytes(32));
    const initialPrivateState = simulator.getPrivateState();
    simulator.increment();
    // the private state shouldn't change
    expect(initialPrivateState).toEqual(simulator.getPrivateState());
    const ledgerState = simulator.getLedger();
    expect(ledgerState.count).toEqual(1n);
    expect(ledgerState.totalOperations).toEqual(1n);
  });

  it("lets you increment the counter by a private amount", () => {
    const simulator = new CounterSimulator(randomBytes(32), 7n);
    simulator.incrementByPrivateAmount();
    const ledgerState = simulator.getLedger();
    expect(ledgerState.count).toEqual(7n);
    expect(ledgerState.totalOperations).toEqual(1n);
  });

  it("accumulates count and totalOperations across multiple operations", () => {
    const simulator = new CounterSimulator(randomBytes(32), 3n);
    simulator.increment();
    simulator.incrementByPrivateAmount();
    simulator.increment();
    const ledgerState = simulator.getLedger();
    expect(ledgerState.count).toEqual(5n); // 1 + 3 + 1
    expect(ledgerState.totalOperations).toEqual(3n);
  });

  it("rejects a private increment amount of zero", () => {
    const simulator = new CounterSimulator(randomBytes(32), 0n);
    expect(() => simulator.incrementByPrivateAmount()).toThrow(
      "failed assert: Increment amount must be greater than zero",
    );
  });

  it("rejects a private increment amount over the step limit", () => {
    const simulator = new CounterSimulator(randomBytes(32), 101n);
    expect(() => simulator.incrementByPrivateAmount()).toThrow(
      "failed assert: Increment amount exceeds maximum allowed step limit",
    );
  });

  it("lets the last actor reset (bump operations on) the counter", () => {
    const simulator = new CounterSimulator(randomBytes(32));
    simulator.increment();
    expect(() => simulator.reset()).not.toThrow();
    const ledgerState = simulator.getLedger();
    expect(ledgerState.totalOperations).toEqual(2n);
  });

  it("doesn't let a user who hasn't acted yet reset the counter", () => {
    const simulator = new CounterSimulator(randomBytes(32));
    expect(() => simulator.reset()).toThrow(
      "failed assert: Only the last actor can reset the counter",
    );
  });
});
