import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTION,
  BAD_FOOD_TYPE,
  GOOD_FOOD_TYPE,
  SENSOR_COUNT,
  applyActionAndAdvance,
  collectPerceptionAndReward,
  createWorld,
  moveObjectTo,
  selectObject,
  wrapAngle,
} from "../src/microworld/simulation.ts";

test("world initialization is repeatable and uses one agent with five foods per type", () => {
  const first = createWorld(42);
  const second = createWorld(42);

  assert.deepEqual(first, second);
  assert.equal(first.foods.length, 10);
  assert.equal(first.foods.filter((food) => food.type === GOOD_FOOD_TYPE).length, 5);
  assert.equal(first.foods.filter((food) => food.type === BAD_FOOD_TYPE).length, 5);
  assert.equal(first.sensors.length, SENSOR_COUNT);
  assert.equal(first.counters.good / first.counters.bad, 1);
});

test("six sensor channels separate three positive and three negative sectors", () => {
  const world = createWorld(1, { foodCount: 0, viewDistance: 200 });
  world.agent.x = 400;
  world.agent.y = 300;
  world.agent.angle = 0;
  world.foods = [
    { id: "good-left", type: GOOD_FOOD_TYPE, x: 550, y: 200, radius: 12.5, angle: 0, speed: 0 },
    { id: "good-front", type: GOOD_FOOD_TYPE, x: 580, y: 300, radius: 12.5, angle: 0, speed: 0 },
    { id: "bad-right", type: BAD_FOOD_TYPE, x: 550, y: 400, radius: 12.5, angle: 0, speed: 0 },
  ];

  const input = collectPerceptionAndReward(world, () => 0.5);
  assert.ok(Math.abs(input.sensors[0] - (1 - Math.sqrt(32_500) / 200)) < 1e-12);
  assert.ok(Math.abs(input.sensors[1] - 0.1) < 1e-12);
  assert.equal(input.sensors[2], 0);
  assert.equal(input.sensors[3], 0);
  assert.equal(input.sensors[4], 0);
  assert.ok(Math.abs(input.sensors[5] - (1 - Math.sqrt(32_500) / 200)) < 1e-12);
});

test("good and bad collisions emit the original signed reward and respawn the food", () => {
  const world = createWorld(8, { foodCount: 0 });
  world.agent.x = 100;
  world.agent.y = 100;
  world.foods = [
    { id: "good", type: GOOD_FOOD_TYPE, x: 100, y: 100, radius: 12.5, angle: 0, speed: 0 },
    { id: "bad", type: BAD_FOOD_TYPE, x: 300, y: 300, radius: 12.5, angle: 0, speed: 0 },
  ];
  let randomValue = 0.5;

  const good = collectPerceptionAndReward(world, () => randomValue);
  assert.equal(good.reward, 1);
  assert.equal(good.rewardType, "good");
  assert.equal(world.counters.ateGood, 1);
  assert.notDeepEqual([world.foods[0].x, world.foods[0].y], [100, 100]);

  world.foods[0].x = 500;
  world.foods[0].y = 500;
  world.foods[1].x = 100;
  world.foods[1].y = 100;
  const bad = collectPerceptionAndReward(world, () => randomValue);
  assert.equal(bad.reward, -1);
  assert.equal(bad.rewardType, "bad");
  assert.equal(world.counters.ateBad, 1);
});

test("physics applies friction, acceleration, turning, wraparound, and tick advancement", () => {
  const world = createWorld(4, { foodCount: 0 });
  world.agent.x = 798;
  world.agent.y = 300;
  world.agent.angle = 0;
  world.agent.speed = 0;

  applyActionAndAdvance(world, ACTION.FORWARD);
  assert.equal(world.agent.speed, 10);
  assert.equal(world.agent.x, 8);
  assert.equal(world.tick, 1);

  const beforeAngle = world.agent.angle;
  applyActionAndAdvance(world, ACTION.LEFT);
  assert.equal(world.agent.angle, wrapAngle(beforeAngle + 0.5));
  assert.ok(Math.abs(world.agent.speed - 9) < 1e-9);
});

test("selection and manual object placement use world-space coordinates", () => {
  const world = createWorld(5, { foodCount: 0 });
  world.agent.x = 120;
  world.agent.y = 90;
  assert.equal(selectObject(world, 121, 91)?.id, "agent");
  assert.equal(moveObjectTo(world, "agent", 900, -20), true);
  assert.deepEqual([world.agent.x, world.agent.y, world.agent.speed], [800, 0, 0]);
  assert.equal(moveObjectTo(world, "missing", 0, 0), false);
});
