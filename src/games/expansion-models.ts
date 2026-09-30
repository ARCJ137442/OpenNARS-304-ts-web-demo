import * as tictactoe from "./worlds/tictactoe.ts";
import * as shot from "./worlds/shot.ts";
import * as testchamber from "./worlds/testchamber.ts";
import * as fighterplane from "./worlds/fighterplane.ts";
import * as echoRelay from "./expansion/worlds/echo-relay.ts";
import type { ExpansionDefinition, ExpansionId, ExpansionResult, ExpansionState, ExpansionNarsStep, TicTacToeState, ShotState, TestChamberState, FighterPlaneState, EchoRelayState } from "./expansion-types.ts";

export * from "./expansion-types.ts";
export const EXPANSION_DEFINITIONS: Readonly<Record<ExpansionId, ExpansionDefinition>> = Object.freeze({
  tictactoe: tictactoe.definition, shot: shot.definition, testchamber: testchamber.definition, fighterplane: fighterplane.definition, "echo-relay": echoRelay.definition,
});
export function createExpansionState(id: "tictactoe", seed?: number): TicTacToeState;
export function createExpansionState(id: "shot", seed?: number): ShotState;
export function createExpansionState(id: "testchamber", seed?: number): TestChamberState;
export function createExpansionState(id: "fighterplane", seed?: number): FighterPlaneState;
export function createExpansionState(id: "echo-relay", seed?: number): EchoRelayState;
export function createExpansionState(id: ExpansionId, seed?: number): ExpansionState;
export function createExpansionState(id: ExpansionId, seed = 3040304): ExpansionState {
  switch (id) { case "tictactoe": return tictactoe.create(seed); case "shot": return shot.create(seed); case "testchamber": return testchamber.create(seed); case "fighterplane": return fighterplane.create(seed); case "echo-relay": return echoRelay.create(seed); }
}
export function buildExpansionNarsStep(state: ExpansionState): ExpansionNarsStep {
  switch (state.game) { case "tictactoe": return tictactoe.buildNarsStep(state); case "shot": return shot.buildNarsStep(state); case "testchamber": return testchamber.buildNarsStep(state); case "fighterplane": return fighterplane.buildNarsStep(state); case "echo-relay": return echoRelay.buildNarsStep(state); }
}
export function advanceExpansion(state: ExpansionState, action: string | null = null): ExpansionResult {
  switch (state.game) { case "tictactoe": return tictactoe.advance(state, action); case "shot": return shot.advance(state, action); case "testchamber": return testchamber.advance(state, action); case "fighterplane": return fighterplane.advance(state, action); case "echo-relay": return echoRelay.advance(state, action); }
}
export function applyExpansionControl(state: ExpansionState, action: string): boolean {
  switch (state.game) { case "tictactoe": return tictactoe.applyManualControl(state, action); case "shot": return shot.applyManualControl(state, action); case "testchamber": return testchamber.applyManualControl(state, action); case "fighterplane": return fighterplane.applyManualControl(state, action); case "echo-relay": return echoRelay.applyManualControl(state, action); }
}
