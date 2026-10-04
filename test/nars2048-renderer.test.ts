import assert from "node:assert/strict";
import test from "node:test";

import { calculateBoardGeometry, gridPoint } from "../src/nars2048-renderer.ts";

test("2048 board geometry fits the smaller available dimension", () => {
  const geometry = calculateBoardGeometry(500, 300, 2);
  assert.ok(geometry);
  assert.ok(geometry.width <= 300);
  assert.ok(geometry.height <= 300);
  assert.equal(geometry.dpr, 2);
  assert.equal(geometry.pad, geometry.gap);
});

test("2048 particle coordinates preserve cell-space offsets and align to grid centers", () => {
  const geometry = calculateBoardGeometry(600, 600);
  assert.ok(geometry);

  const firstCell = gridPoint(geometry, 0, 0);
  const firstCenter = gridPoint(geometry, 0.5, 0.5);
  const secondCell = gridPoint(geometry, 1, 0);
  assert.equal(firstCenter.x, firstCell.x + geometry.cell / 2);
  assert.equal(firstCenter.y, firstCell.y + geometry.cell / 2);
  assert.equal(secondCell.x, firstCell.x + geometry.cell + geometry.gap);
});

test("2048 geometry rejects unavailable and unusably small containers", () => {
  assert.equal(calculateBoardGeometry(0, 300), null);
  assert.equal(calculateBoardGeometry(10, 10), null);
});
