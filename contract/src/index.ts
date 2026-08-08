// Midnight Counter Smart Contract Module
// SPDX-License-Identifier: Apache-2.0

import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "./managed/counter/contract/index.js";
export * from "./witnesses.js";

import * as CompiledCounterContract from "./managed/counter/contract/index.js";
import * as Witnesses from "./witnesses.js";

export const CompiledCounterContractContract = CompiledContract.make<
  CompiledCounterContract.Contract<Witnesses.CounterPrivateState>
>(
  "Counter",
  CompiledCounterContract.Contract<Witnesses.CounterPrivateState>,
).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets("./managed/counter"),
);
