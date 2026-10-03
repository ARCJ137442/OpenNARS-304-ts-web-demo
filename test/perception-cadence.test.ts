import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_DEFINITIONS } from "../src/games/models.ts";
import { PerceptionCadence } from "../src/games/perception-cadence.ts";

const input = (belief: string, feedback: string[] = []) => ({
  beliefs: [belief], goals: ["goal"], feedback, cycles: 10,
});

test("stable expansion state refreshes periodically while changes and outcome events remain immediate", () => {
  const cadence = new PerceptionCadence(5, 5);
  for (let tick = 1; tick <= 5; tick += 1) {
    assert.deepEqual(cadence.select(tick, input("left")).beliefs, ["left"]);
  }
  const stable = cadence.select(6, input("left", ["reward"]));
  assert.deepEqual(stable.beliefs, []);
  assert.deepEqual(stable.goals, []);
  assert.deepEqual(stable.feedback, ["reward"]);
  assert.deepEqual(cadence.select(7, input("right")).beliefs, ["right"]);
  assert.deepEqual(cadence.select(8, input("right")).beliefs, []);
  assert.deepEqual(cadence.select(10, input("right")).goals, ["goal"]);
  cadence.reset();
  assert.deepEqual(cadence.select(1, input("right")).beliefs, ["right"]);
});

test("change-based framing is scoped to the five expansion worlds", () => {
  for (const game of ["tictactoe", "shot", "testchamber", "fighterplane", "echo-relay"] as const) {
    assert.deepEqual(DEMO_DEFINITIONS[game].perceptionCadence, { warmupTicks: 5, refreshEvery: 5 });
  }
  assert.equal(DEMO_DEFINITIONS.pong.perceptionCadence, undefined);
});
