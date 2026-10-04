import assert from "node:assert/strict";
import test from "node:test";
import { buildNarsInput, createGame, move } from "../src/games/nars2048.ts";

test("2048 merges once per adjacent pair without mutating the trial input", () => {
  const game = createGame(1); game.board = [2, 2, 2, 0, ...new Array(12).fill(0)];
  const before = [...game.board]; const result = move(game, "left");
  assert.equal(result.changed, true); assert.equal(game.board[0], 4); assert.equal(game.board[1], 2); assert.notDeepEqual(game.board, before); assert.equal(game.merges, 1);
});

test("2048 input exposes composite goal and feedback", () => {
  const input = buildNarsInput(createGame(4));
  assert.ok(input.goals[0].startsWith("<(&/")); assert.ok(input.beliefs.length >= 3);
});

test("2048 seed and moves are reproducible", () => {
  const a = createGame(304), b = createGame(304); move(a, "left"); move(b, "left"); assert.deepEqual(a, b);
});
