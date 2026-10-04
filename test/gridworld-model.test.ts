import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceGridWorld, allCells, collectGridSensors, createGridWorld, moveGridObject,
  forwardCell, headingAngle, headingCount, type GridTopology,
} from "../src/gridworld/model.ts";

const topologies: GridTopology[] = ["square", "triangle", "hexagon"];

for (const topology of topologies) {
  test(`${topology} has edge-neighbor movement and toroidal wrapping`, () => {
    const count = headingCount(topology);
    const cells = allCells(topology, 6, 5);
    assert.equal(cells.length, 6 * 5 * (topology === "triangle" ? 2 : 1));
    for (const cell of cells) {
      const neighbors = Array.from({ length: count }, (_, heading) => forwardCell(topology, 6, 5, cell, heading));
      assert.equal(new Set(neighbors.map((next) => `${next.col}:${next.row}:${next.face}`)).size, count);
      for (const next of neighbors) {
        assert.ok(next.col >= 0 && next.col < 6 && next.row >= 0 && next.row < 5);
        assert.ok(Array.from({ length: count }, (_, heading) => forwardCell(topology, 6, 5, next, heading))
          .some((back) => back.col === cell.col && back.row === cell.row && back.face === cell.face));
      }
    }
  });

  test(`${topology} left is counterclockwise and right is clockwise`, () => {
    const left = createGridWorld(topology, 8, 6, 19, 0);
    const right = createGridWorld(topology, 8, 6, 19, 0);
    const startingAngle = headingAngle(topology, left.agent.cell, 0);
    advanceGridWorld(left, 2);
    advanceGridWorld(right, 1);
    assert.equal(left.agent.heading, headingCount(topology) - 1);
    assert.equal(right.agent.heading, 1);
    const signed = (angle: number) => Math.atan2(Math.sin(angle - startingAngle), Math.cos(angle - startingAngle));
    assert.ok(signed(headingAngle(topology, left.agent.cell, left.agent.heading)) < 0);
    assert.ok(signed(headingAngle(topology, right.agent.cell, right.agent.heading)) > 0);
  });

  test(`${topology} reproducibly places food and reports a signed collision`, () => {
    const world = createGridWorld(topology, 8, 6, 304, 3);
    assert.deepEqual(world, createGridWorld(topology, 8, 6, 304, 3));
    const destination = forwardCell(topology, world.cols, world.rows, world.agent.cell, world.agent.heading);
    world.foods = [{ id: "good", kind: "good", cell: destination, angle: 0 }];
    const before = collectGridSensors(world);
    assert.equal(before.length, 6);
    assert.ok(before.slice(0, 3).some((value) => value > 0));
    const result = advanceGridWorld(world, 3);
    assert.equal(result.eaten, "good");
    assert.equal(result.moved, true);
    assert.equal(world.reward, 1);
    assert.equal(world.eaten.good, 1);
    assert.notDeepEqual(world.foods[0].cell, world.agent.cell);
  });

  test(`${topology} supports dragging the agent and food onto topology cells`, () => {
    const world = createGridWorld(topology, 8, 6, 55, 1);
    const target = allCells(topology, 8, 6).at(-1)!;
    assert.equal(moveGridObject(world, "agent", target), true);
    assert.deepEqual(world.agent.cell, target);
    assert.equal(moveGridObject(world, "good-1", target), true);
    assert.deepEqual(world.foods.find((food) => food.id === "good-1")?.cell, target);
    assert.equal(moveGridObject(world, "missing", target), false);
  });
}
