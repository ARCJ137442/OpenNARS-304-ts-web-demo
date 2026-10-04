import assert from "node:assert/strict";
import test from "node:test";

import {
  BoundedExperienceBuffer,
  EXPERIENCE_LIMIT,
  EXPERIENCE_PER_TIME_LIMIT,
} from "../src/experience/contract.ts";

const event = (narTime: string, index: number) => ({
  kind: "belief" as const,
  source: "nars" as const,
  autonomous: true,
  narTime,
  text: `belief-${index}`,
  evidence: `<belief-${index}>.`,
});

test("experience buffer bounds total entries and per-cycle bursts", () => {
  const buffer = new BoundedExperienceBuffer(3, 2);
  assert.ok(buffer.push(event("1", 1)));
  assert.ok(buffer.push(event("1", 2)));
  assert.equal(buffer.push(event("1", 3)), null);
  assert.ok(buffer.push(event("2", 4)));
  assert.ok(buffer.push(event("3", 5)));
  assert.deepEqual(buffer.snapshot().map((entry) => entry.text), ["belief-2", "belief-4", "belief-5"]);
  assert.deepEqual(buffer.stats(), { retained: 3, dropped: 2 });
  assert.equal(EXPERIENCE_LIMIT, 96);
  assert.equal(EXPERIENCE_PER_TIME_LIMIT, 8);
});

test("experience buffer reset clears the observation window", () => {
  const buffer = new BoundedExperienceBuffer();
  buffer.push(event("1", 1));
  buffer.reset();
  assert.deepEqual(buffer.snapshot(), []);
  assert.deepEqual(buffer.stats(), { retained: 0, dropped: 0 });
});
