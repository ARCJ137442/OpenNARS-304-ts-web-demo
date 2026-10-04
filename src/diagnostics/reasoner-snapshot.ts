import type { BeliefSnapshot } from "../experience/contract.ts";

export type ReasonerSnapshot = {
  concepts: number;
  conceptCapacity: number;
  novelTasks: number;
  sequenceTasks: number;
  recentOperations: number;
  narTime: string;
};

type SizedBag = { size(): number };
type ReasonerSnapshotSource = {
  memory: {
    concepts: SizedBag;
    novelTasks: SizedBag;
    seq_current: SizedBag;
    recent_operations: SizedBag;
  };
  narParameters: { CONCEPT_BAG_SIZE: number };
  time(): unknown;
};

function bagSize(bag: SizedBag): number {
  const size = Number(bag.size());
  return Number.isSafeInteger(size) && size >= 0 ? size : 0;
}

export function readReasonerSnapshot(reasoner: ReasonerSnapshotSource): ReasonerSnapshot {
  return {
    concepts: bagSize(reasoner.memory.concepts),
    conceptCapacity: Number(reasoner.narParameters.CONCEPT_BAG_SIZE) || 0,
    novelTasks: bagSize(reasoner.memory.novelTasks),
    sequenceTasks: bagSize(reasoner.memory.seq_current),
    recentOperations: bagSize(reasoner.memory.recent_operations),
    narTime: String(reasoner.time()),
  };
}

type TruthLike = { getExpectation(): number; frequency: number; confidence: number };
type SentenceLike = { getTruth(): TruthLike; toString(): string };
type TaskLike = { sentence: SentenceLike; getBudget(): { summary(): number } };
type ConceptLike = { getBeliefs(): Iterable<TaskLike> };
type BeliefSnapshotSource = { memory: { concepts: Iterable<ConceptLike> }; time(): unknown };

/** Read only the most promising retained beliefs when the user opens the observatory. */
export function readTopBeliefs(reasoner: BeliefSnapshotSource, limit = 8): BeliefSnapshot[] {
  const beliefs: BeliefSnapshot[] = [];
  for (const concept of reasoner.memory.concepts) {
    for (const task of concept.getBeliefs()) {
      try {
        const truth = task.sentence.getTruth();
        const expectation = Number(truth?.getExpectation());
        if (!Number.isFinite(expectation)) continue;
        beliefs.push({
          text: String(task.sentence),
          expectation,
          frequency: Number(truth.frequency),
          confidence: Number(truth.confidence),
          budget: Number(task.getBudget().summary()),
          narTime: String(reasoner.time()),
        });
      } catch {
        // Questions and malformed transitional tasks have no usable truth value.
      }
    }
  }
  const unique = new Map<string, BeliefSnapshot>();
  for (const belief of beliefs.sort((left, right) => right.expectation - left.expectation || right.budget - left.budget)) {
    const previous = unique.get(belief.text);
    if (previous === undefined || belief.expectation > previous.expectation) unique.set(belief.text, belief);
  }
  return [...unique.values()]
    .filter((belief) => Number.isFinite(belief.budget))
    .sort((left, right) => right.expectation - left.expectation || right.budget - left.budget || left.text.localeCompare(right.text))
    .slice(0, Math.max(0, Math.floor(limit)));
}
