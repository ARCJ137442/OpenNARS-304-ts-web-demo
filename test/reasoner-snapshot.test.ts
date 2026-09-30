import assert from "node:assert/strict";
import test from "node:test";

import { readReasonerSnapshot } from "../src/diagnostics/reasoner-snapshot.ts";

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
