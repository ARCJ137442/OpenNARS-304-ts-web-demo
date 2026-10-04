import assert from "node:assert/strict";
import test from "node:test";

import { readReasonerSnapshot, readTopBeliefs } from "../src/diagnostics/reasoner-snapshot.ts";

test("reasoner snapshot reads bounded bag counts without traversing bag contents", () => {
  const calls = { concepts: 0, novel: 0, sequence: 0, operations: 0 };
  const sizedBag = (key: keyof typeof calls, size: number) => ({
    size() {
      calls[key] += 1;
      return size;
    },
  });
  const snapshot = readReasonerSnapshot({
    memory: {
      concepts: sizedBag("concepts", 312),
      novelTasks: sizedBag("novel", 4),
      seq_current: sizedBag("sequence", 2),
      recent_operations: sizedBag("operations", 1),
    },
    narParameters: { CONCEPT_BAG_SIZE: 10000 },
    time: () => 728,
  });

  assert.deepEqual(snapshot, {
    concepts: 312,
    conceptCapacity: 10000,
    novelTasks: 4,
    sequenceTasks: 2,
    recentOperations: 1,
    narTime: "728",
  });
  assert.deepEqual(calls, { concepts: 1, novel: 1, sequence: 1, operations: 1 });
});

test("top beliefs are sorted by expectation and expose their truth values", () => {
  const belief = (text: string, expectation: number, budget: number) => ({
    sentence: {
      toString: () => text,
      getTruth: () => ({ getExpectation: () => expectation, frequency: expectation, confidence: 0.8 }),
    },
    getBudget: () => ({ summary: () => budget }),
  });
  const snapshot = readTopBeliefs({
    memory: { concepts: [{ getBeliefs: () => [belief("low", 0.4, 0.9), belief("high", 0.9, 0.2)] }] },
    time: () => 42,
  });
  assert.deepEqual(snapshot.map((entry) => entry.text), ["high", "low"]);
  assert.equal(snapshot[0].expectation, 0.9);
  assert.equal(snapshot[0].narTime, "42");
});

test("top beliefs project temporal evidence to the current NAR clock before ranking", () => {
  const projected = {
    toString: () => "projected@42",
    getTruth: () => ({ getExpectation: () => 0.95, frequency: 1, confidence: 0.95 }),
  };
  const stale = {
    sentence: {
      toString: () => "stale@10",
      getTruth: () => ({ getExpectation: () => 0.99, frequency: 1, confidence: 0.99 }),
      projection: (target: unknown, current: unknown, memory: unknown) => {
        assert.equal(target, 42);
        assert.equal(current, 42);
        assert.ok(memory);
        return projected;
      },
    },
    getBudget: () => ({ summary: () => 1 }),
  };
  const fresh = {
    sentence: {
      toString: () => "fresh@42",
      getTruth: () => ({ getExpectation: () => 0.9, frequency: 1, confidence: 0.8 }),
      projection: () => ({
        toString: () => "fresh@42",
        getTruth: () => ({ getExpectation: () => 0.9, frequency: 1, confidence: 0.8 }),
      }),
    },
    getBudget: () => ({ summary: () => 1 }),
  };
  const beliefs = readTopBeliefs({ memory: { concepts: [{ getBeliefs: () => [stale, fresh] }] }, time: () => 42 });
  assert.deepEqual(beliefs.map((belief) => belief.text), ["projected@42", "fresh@42"]);
});
