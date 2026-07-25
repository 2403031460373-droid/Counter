// Midnight Counter DApp Witness Declarations
// SPDX-License-Identifier: Apache-2.0

import { Ledger } from "./managed/counter/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export type CounterPrivateState = {
  readonly secretKey: Uint8Array;
  readonly secretAmount: bigint;
};

export const createCounterPrivateState = (
  secretKey: Uint8Array,
  secretAmount: bigint = 1n,
): CounterPrivateState => ({
  secretKey,
  secretAmount,
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, CounterPrivateState>): [
    CounterPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],

  secretAmount: ({
    privateState,
  }: WitnessContext<Ledger, CounterPrivateState>): [
    CounterPrivateState,
    bigint,
  ] => [privateState, privateState.secretAmount],
};
