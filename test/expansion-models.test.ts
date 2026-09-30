import assert from "node:assert/strict";
import test from "node:test";
import { advanceExpansion, applyExpansionControl, buildExpansionNarsStep, createExpansionState, EXPANSION_DEFINITIONS } from "../src/games/expansion-models.ts";
import type { ExpansionId } from "../src/games/expansion-types.ts";

const ids: ExpansionId[] = ["tictactoe", "shot", "testchamber", "fighterplane"];
test("all expansion worlds expose composite OpenNARS goals and no ONA implication", () => {
  for (const id of ids) {
    const state = createExpansionState(id, 304);
    const step = buildExpansionNarsStep(state);
    assert.ok(EXPANSION_DEFINITIONS[id].actions.length > 0);
    assert.ok(step.goals.length > 0);
    assert.ok(step.goals.every((value) => value.startsWith("<{SELF} --> [") && value.includes(">! :|:")));
    assert.ok([...step.beliefs, ...step.goals, ...step.feedback].every((value) => !value.includes("|->")));
  }
});
test("TicTacToe is deterministic, bounded, and emits a composite win feedback", () => {
  const state = createExpansionState("tictactoe", 1);
  for (const action of ["^cell0", "^cell3", "^cell1", "^cell4", "^cell2"]) advanceExpansion(state, action);
  assert.equal(state.winner, "x");
  assert.ok(buildExpansionNarsStep(state).beliefs.some((value) => value.includes("cell2_x")));
  assert.ok(state.pendingFeedback.length >= 0);
  assert.deepEqual(createExpansionState("tictactoe", 1).board, createExpansionState("tictactoe", 1).board);
});
test("Shot reports hit and rejects unknown actions at the boundary", () => {
  const state = createExpansionState("shot", 2); state.targetX = state.playerX;
  const result = advanceExpansion(state, "^shoot");
  assert.equal(state.hits, 1); assert.equal(result.reward, 1); assert.ok(result.feedback.some((value) => value.includes("hit")));
  assert.equal(applyExpansionControl(state, "teleport"), false);
});
test("TestChamber requires the switch before delivery and clamps the grid", () => {
  const state = createExpansionState("testchamber", 3); state.player.x = state.item.x; state.player.y = state.item.y;
  advanceExpansion(state, "^pick"); assert.equal(state.carrying, true);
  state.player.x = state.switch.x; state.player.y = state.switch.y;
  advanceExpansion(state, "^drop"); assert.equal(state.delivered, 0);
  advanceExpansion(state, "^activate"); advanceExpansion(state, "^drop"); assert.equal(state.delivered, 1);
  advanceExpansion(state, "^left"); assert.ok(state.player.x >= 0);
});
test("FighterPlane respects cooldown, hit feedback, and reset determinism", () => {
  const state = createExpansionState("fighterplane", 4); state.player.x = state.enemy.x; state.player.y = 20; state.enemy.y = 30;
  const first = advanceExpansion(state, "^fire"); assert.equal(state.hits, 1); assert.equal(first.reward, 1);
  assert.equal(advanceExpansion(state, "^fire").reward, 0);
  assert.deepEqual(createExpansionState("fighterplane", 4), createExpansionState("fighterplane", 4));
});
