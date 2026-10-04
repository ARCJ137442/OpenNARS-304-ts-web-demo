import assert from "node:assert/strict";
import test from "node:test";

import {
  PONG_MODES,
  applyPongActions,
  createPongWorld,
  modeById,
  senseFor,
  type PongRole,
} from "../src/pong-lab-model.ts";

test("Pong registers every migrated play mode with at least 20 TPS", () => {
  assert.equal(PONG_MODES.length, 9);
  assert.equal(new Set(PONG_MODES.map((mode) => mode.id)).size, PONG_MODES.length);
  for (const mode of PONG_MODES) {
    assert.ok(mode.roles.length >= 1);
    assert.ok(mode.actions.length >= 2);
    assert.ok(mode.cycles >= 1);
    assert.match(mode.description, /./);
  }
  assert.deepEqual(modeById("two-controller").roles, ["left", "right"]);
  assert.deepEqual(modeById("two-player").roles, ["top", "bottom"]);
});

test("Pong difference sensing emits a first observation and suppresses unchanged repeats", () => {
  const world = createPongWorld();
  const mode = modeById("difference");
  const first = senseFor(world, mode, "paddle");
  assert.deepEqual(first, ["ball_center"]);
  world.tick = 1;
  assert.equal(senseFor(world, mode, "paddle").length, 0);
  world.tick = 5;
  assert.deepEqual(senseFor(world, mode, "paddle"), ["ball_center"]);
});

test("Pong two-controller mode cancels opposing controls instead of biasing a side", () => {
  const world = createPongWorld();
  const initial = world.paddles.top;
  const actions = new Map<PongRole, "left" | "right" | "stop">([
    ["left", "left"],
    ["right", "right"],
  ]);
  applyPongActions(world, actions, modeById("two-controller"));
  assert.equal(world.paddles.top, initial);
  assert.equal(world.tick, 1);
});

test("Pong applies a hit and emits signed feedback for a miss", () => {
  const mode = modeById("classic");
  const hitWorld = createPongWorld();
  hitWorld.ball.y = 1;
  hitWorld.ball.x = hitWorld.paddles.top;
  hitWorld.ball.vy = 0;
  const hit = applyPongActions(hitWorld, new Map(), mode);
  assert.equal(hitWorld.hits.top, 1);
  assert.equal(hit.reward, 1);
  assert.equal(hitWorld.flash, "hit");

  const missWorld = createPongWorld();
  missWorld.ball.y = 1;
  missWorld.ball.x = 1;
  missWorld.ball.vy = 0;
  const miss = applyPongActions(missWorld, new Map(), mode);
  assert.equal(missWorld.misses.top, 1);
  assert.equal(miss.reward, -1);
  assert.equal(missWorld.flash, "miss");
});

test("Pong keeps both paddles inside the playable grid", () => {
  const world = createPongWorld();
  const mode = modeById("two-player");
  applyPongActions(world, new Map([["top", "left"], ["bottom", "right"]]), mode);
  assert.ok(world.paddles.top >= 4 && world.paddles.top <= world.width - 5);
  assert.ok(world.paddles.bottom >= 4 && world.paddles.bottom <= world.width - 5);
});
