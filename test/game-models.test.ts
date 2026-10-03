import assert from "node:assert/strict";
import test from "node:test";

import {
  DEMO_DEFINITIONS,
  advanceDemo,
  applyManualGameControl,
  buildNarsStep,
  createDemoState,
  resetGame,
} from "../src/games/models.ts";
import { DEMO_CATALOG, GAME_DEMOS, isDemoId } from "../src/data/demo-catalog.ts";

test("registered demos expose a title, source, license, actions, and bounded NARS step", () => {
  for (const game of ["pong", "alien", "bandrobot", "cartpole", "hunt"] as const) {
    const definition = DEMO_DEFINITIONS[game];
    const state = createDemoState(game, 304);
    const input = buildNarsStep(state);
    assert.ok(definition.title.length > 0);
    assert.match(definition.url, /^https:\/\//);
    assert.ok(definition.license.length > 0);
    assert.ok(definition.actions.length > 0);
    assert.ok(input.cycles >= 1 && input.cycles <= 40);
    assert.ok(Array.isArray(input.beliefs) && Array.isArray(input.goals));
    assert.ok(input.goals.every((goal) => goal.startsWith("<{SELF} --> [") && goal.includes(">! :|:")));
    assert.ok(input.goals.every((goal) => !/^[A-Za-z0-9_]+!/.test(goal)));
  }
});

test("the static Lab catalog provides one reachable route for every registered game", () => {
  const ids = GAME_DEMOS.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), Object.keys(DEMO_DEFINITIONS).sort());
  assert.equal(DEMO_CATALOG.length, GAME_DEMOS.length + 2);
  assert.equal(DEMO_CATALOG.find((entry) => entry.id === "terminal")?.href, "./terminal.html");
  for (const entry of GAME_DEMOS) {
    assert.equal(isDemoId(entry.id), true);
    assert.equal(entry.href, "./demo.html?game=" + entry.id);
    assert.equal(entry.preview, entry.id);
  }
  assert.equal(isDemoId("unknown"), false);
});

test("Pong advances ball and applies the registered left/right action", () => {
  const game = createDemoState("pong", 1);
  const initialX = game.paddleX;
  advanceDemo(game, "^Right");
  assert.equal(game.paddleX, initialX + 10);
  assert.equal(game.tick, 1);
});

test("Alien resolves shooting and feeds a successful hit back into NARS", () => {
  const game = createDemoState("alien", 2);
  game.alienX = game.defenderX;
  const result = advanceDemo(game, "^shoot");
  assert.equal(game.shots, 1);
  assert.equal(game.hits, 1);
  assert.ok(result.feedback.includes("<{SELF} --> [hit]>. :|:"));
});

test("BandRobot completes pick, transport, drop and emits delivery feedback", () => {
  const game = createDemoState("bandrobot", 3);
  const perception = buildNarsStep(game);
  assert.deepEqual(perception.beliefs, ["<{SELF} --> [pickup_right]>. :|:"]);
  assert.deepEqual(perception.goals, ["<{SELF} --> [pickup_approach]>! :|:"]);
  assert.ok(perception.beliefs.every((belief) => !belief.includes("|->")));
  advanceDemo(game, "^right");
  assert.ok(buildNarsStep(game).feedback.includes("<{SELF} --> [pickup_approach]>. :|:"));
  game.position = game.target;
  assert.deepEqual(buildNarsStep(game).goals, ["<{SELF} --> [picked]>! :|:"]);
  advanceDemo(game, "^pick");
  assert.equal(game.picked, true);
  assert.deepEqual(buildNarsStep(game).goals, ["<{SELF} --> [delivery_approach]>! :|:"]);
  game.position = game.goal;
  const result = advanceDemo(game, "^drop");
  assert.equal(game.picked, false);
  assert.equal(game.successes, 1);
  assert.ok(result.feedback.includes("<{SELF} --> [delivered]>. :|:"));
});

test("CartPole feeds back an acted-on upright outcome and uses fixed left/right torque", () => {
  const game = createDemoState("cartpole", 4);
  const input = buildNarsStep(game);
  assert.deepEqual(input.beliefs, ["<{SELF} --> [tilt_right]>. :|:"]);
  assert.deepEqual(input.feedback, [], "the initial upright state is not an action outcome");
  assert.ok(Math.abs(game.angle) < 0.1, "the initial pole must be near upright, not horizontal");
  const noAction = createDemoState("cartpole", 4);
  advanceDemo(noAction, null);
  advanceDemo(noAction, null);
  assert.ok(noAction.angle > 0.08 && noAction.angleVelocity > 0, "gravity must pull a positive perturbation toward down");
  const left = createDemoState("cartpole", 4);
  const right = createDemoState("cartpole", 4);
  advanceDemo(left, "^left");
  advanceDemo(right, "^right");
  assert.ok(left.angleVelocity < 0 && right.angleVelocity > 0, "actions apply fixed opposite torques");
  assert.ok(buildNarsStep(left).feedback.includes("<{SELF} --> [good]>. :|:"));
  assert.deepEqual(buildNarsStep(right).feedback, [], "an action that increases deviation is not a good result");
  for (let index = 0; index < 20; index += 1) advanceDemo(game, index % 2 ? "^Left" : "^Right");
  assert.ok(Math.abs(game.angleVelocity) <= game.maxAngleVelocity);
  assert.ok(game.position >= 0 && game.position <= 1);
});

test("Hunt catches the co-located target and resets it inside the grid", () => {
  const game = createDemoState("hunt", 5);
  game.tick = 1;
  game.ballEvery = 10;
  game.ball.x = game.player.x;
  game.ball.y = game.player.y;
  const result = advanceDemo(game, null);
  assert.equal(game.hits, 1);
  assert.ok(result.feedback.includes("<{SELF} --> [good]>. :|:"));
  assert.ok(game.ball.x >= 0 && game.ball.x < game.width);
  assert.ok(game.ball.y >= 0 && game.ball.y < game.height);
});

test("manual inputs alter environment state and reset restores the selected world", () => {
  const game = createDemoState("pong", 6);
  const before = game.paddleX;
  assert.equal(applyManualGameControl(game, "right"), true);
  assert.ok(game.paddleX > before);
  const reset = resetGame(game, 6);
  assert.equal(reset.game, "pong");
  assert.equal(reset.tick, 0);
});
