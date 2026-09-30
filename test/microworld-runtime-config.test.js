import assert from "node:assert/strict";
import test from "node:test";

import {
  JAVA_SIMNAR_TARGET_TPS,
  MICROWORLD_DEFAULT_TPS,
  MICROWORLD_MAX_TPS,
  MICROWORLD_MIN_SMOOTH_TPS,
} from "../src/microworld/runtime-config.ts";

test("Microworld pacing keeps the Java target and browser smoothness floor explicit", () => {
  assert.equal(JAVA_SIMNAR_TARGET_TPS, 50);
  assert.equal(MICROWORLD_MIN_SMOOTH_TPS, 20);
  assert.equal(MICROWORLD_DEFAULT_TPS, MICROWORLD_MIN_SMOOTH_TPS);
  assert.equal(MICROWORLD_MAX_TPS, JAVA_SIMNAR_TARGET_TPS);
});
