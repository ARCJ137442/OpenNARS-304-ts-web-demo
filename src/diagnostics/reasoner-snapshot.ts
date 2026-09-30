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
