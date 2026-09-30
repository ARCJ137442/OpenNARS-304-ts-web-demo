import * as alien from "./worlds/alien.ts";
import * as bandrobot from "./worlds/bandrobot.ts";
import * as cartpole from "./worlds/cartpole.ts";
import * as hunt from "./worlds/hunt.ts";
import * as pong from "./worlds/pong.ts";
import { EXPANSION_DEFINITIONS, createExpansionState, buildExpansionNarsStep, advanceExpansion, applyExpansionControl } from "./expansion-models.ts";
import type { DemoDefinition, DemoId, DemoState, DemoStepResult, NarsStep, StateFor } from "./types.ts";

export * from "./types.ts";
export { isDemoId, seededRandom } from "./shared.ts";

export const DEMO_DEFINITIONS: Readonly<Record<DemoId, DemoDefinition>> = Object.freeze({
  pong: pong.definition,
  alien: alien.definition,
  bandrobot: bandrobot.definition,
  cartpole: cartpole.definition,
  hunt: hunt.definition,
  ...Object.fromEntries(Object.entries(EXPANSION_DEFINITIONS).map(([id, definition]) => [id, { ...definition, babble: 0.08 }])) as Record<string, DemoDefinition>,
  ...Object.fromEntries(Object.entries(EXPANSION_DEFINITIONS).map(([id, definition]) => [id, { ...definition, babble: 0.08 }])),
} as Record<DemoId, DemoDefinition>);

export function createDemoState<G extends DemoId>(game: G, seed?: number): StateFor<G>;
export function createDemoState(game: DemoId, seed = 3040304): DemoState {
  switch (game) {
    case "pong": return pong.create(seed);
    case "alien": return alien.create(seed);
    case "bandrobot": return bandrobot.create(seed);
    case "cartpole": return cartpole.create(seed);
    case "hunt": return hunt.create(seed);
    case "tictactoe": case "shot": case "testchamber": case "fighterplane": return createExpansionState(game, seed);
  }
}

export function buildNarsStep(state: DemoState): NarsStep {
  switch (state.game) {
    case "pong": return pong.buildNarsStep(state);
    case "alien": return alien.buildNarsStep(state);
    case "bandrobot": return bandrobot.buildNarsStep(state);
    case "cartpole": return cartpole.buildNarsStep(state);
    case "hunt": return hunt.buildNarsStep(state);
    case "tictactoe": case "shot": case "testchamber": case "fighterplane": return buildExpansionNarsStep(state);
  }
}

export function advanceDemo(state: DemoState, rawAction: string | null = null, manualControl: string | null = null): DemoStepResult {
  switch (state.game) {
    case "pong": return pong.advance(state, rawAction, manualControl);
    case "alien": return alien.advance(state, rawAction);
    case "bandrobot": return bandrobot.advance(state, rawAction);
    case "cartpole": return cartpole.advance(state, rawAction);
    case "hunt": return hunt.advance(state, rawAction);
    case "tictactoe": case "shot": case "testchamber": case "fighterplane": return advanceExpansion(state, rawAction);
  }
}

export function applyManualGameControl(state: DemoState, control: string): boolean {
  switch (state.game) {
    case "pong": return pong.applyManualControl(state, control);
    case "alien": return alien.applyManualControl(state, control);
    case "bandrobot": return bandrobot.applyManualControl(state, control);
    case "cartpole": return cartpole.applyManualControl(state, control);
    case "hunt": return hunt.applyManualControl(state, control);
    case "tictactoe": case "shot": case "testchamber": case "fighterplane": return applyExpansionControl(state, control);
  }
}

export function resetGame<G extends DemoId>(state: StateFor<G>, seed: number): StateFor<G> {
  return createDemoState(state.game, seed);
}
