import assert from "node:assert/strict";
import test from "node:test";
import { initialDemoSeed } from "../src/demo-seed.ts";

test("a shareable URL seed fixes the environment without calling the random source", () => {
  assert.equal(initialDemoSeed("?game=cartpole&seed=3040304", () => { throw new Error("unexpected random seed"); }), 3040304);
});

test("invalid and out-of-range URL seeds fall back to a fresh seed", () => {
  for (const search of ["", "?seed=0", "?seed=-1", "?seed=1x", "?seed=4294967296"]) {
    assert.equal(initialDemoSeed(search, () => 137), 137);
  }
});
