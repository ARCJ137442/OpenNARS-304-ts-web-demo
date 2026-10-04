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
type SentenceLike = {
  getTruth(): TruthLike;
  toString(): string;
  projection?: (targetTime: unknown, currentTime: unknown, memory: unknown) => SentenceLike;
};
type TaskLike = { sentence: SentenceLike; getBudget(): { summary(): number } };
type ConceptLike = { getBeliefs(): Iterable<TaskLike> };
type BeliefSnapshotSource = { memory: { concepts: Iterable<ConceptLike> }; time(): unknown };

/** Read only the most promising retained beliefs when the user opens the observatory. */
export function readTopBeliefs(reasoner: BeliefSnapshotSource, limit = 8): BeliefSnapshot[] {
  const beliefs: BeliefSnapshot[] = [];
  const currentTime = reasoner.time();
  for (const concept of reasoner.memory.concepts) {
    for (const task of concept.getBeliefs()) {
      try {
        // NAL temporal projection makes old and fresh beliefs comparable at
        // the current NAR clock. The sentence API owns the exact confidence
        // decay and eternalization rules, so the observatory does not copy
        // those formulas or mutate the retained belief.
        const sentence = typeof task.sentence.projection === "function"
          ? task.sentence.projection(currentTime, currentTime, reasoner.memory)
          : task.sentence;
        const truth = sentence.getTruth();
        const expectation = Number(truth?.getExpectation());
        if (!Number.isFinite(expectation)) continue;
        beliefs.push({
          text: String(sentence),
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
