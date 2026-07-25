// Midnight Counter Common Types & Abstractions
// SPDX-License-Identifier: Apache-2.0

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { CounterPrivateState, Contract, Witnesses } from '../../contract/src/index';

export const counterPrivateStateKey = 'counterPrivateState';
export type PrivateStateId = typeof counterPrivateStateKey;

export type PrivateStates = {
  readonly counterPrivateState: CounterPrivateState;
};

export type CounterContract = Contract<CounterPrivateState, Witnesses<CounterPrivateState>>;

export type CounterCircuitKeys = Exclude<keyof CounterContract['impureCircuits'], number | symbol>;

export type CounterProviders = MidnightProviders<CounterCircuitKeys, PrivateStateId, CounterPrivateState>;

export type DeployedCounterContract = FoundContract<CounterContract>;

export type CounterDerivedState = {
  readonly count: bigint;
  readonly totalOperations: bigint;
  readonly lastActor: string;
  readonly isOwner: boolean;
};
