import assert from "node:assert/strict";
import test from "node:test";
import { nextWorldStepDeadline } from "../src/world-clock.ts";

test("a fast reasoner waits only for the remainder of the world period", () => {
  assert.equal(nextWorldStepDeadline(1000, 1010, 20), 1050);
});

test("a slow reasoner starts the next step without adding another period", () => {
  assert.equal(nextWorldStepDeadline(1000, 1300, 20), 1300);
});
