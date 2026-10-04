/**
 * Shared semantic contract for the optional experience observatory.
 *
 * The worker records only events emitted by the reasoner itself. Inputs,
 * starter rules and babble remain separate sources so the UI cannot call them
 * learned experience by accident.
 */
export type ExperienceKind =
  | "anticipation"
  | "confirmation"
  | "disappointment"
  | "derived"
  | "belief"
  | "goal"
  | "answer"
  | "operation";

export type ExperienceSource = "nars" | "input" | "prior" | "babble";

export type ExperienceEvent = {
  id: number;
  kind: ExperienceKind;
  source: ExperienceSource;
  autonomous: boolean;
  narTime: string;
  text: string;
  evidence: string;
  step?: number;
};

export const EXPERIENCE_LIMIT = 96;
export const EXPERIENCE_PER_TIME_LIMIT = 8;

export type ExperienceBufferStats = {
  retained: number;
  dropped: number;
};

/** Bounded, low-allocation event storage shared by browser workers. */
export class BoundedExperienceBuffer {
  private readonly entries: ExperienceEvent[] = [];
  private nextId = 1;
  private dropped = 0;
  private lastNarTime = "";
  private eventsAtTime = 0;
  private readonly limit: number;
  private readonly perTimeLimit: number;

  public constructor(
    limit = EXPERIENCE_LIMIT,
    perTimeLimit = EXPERIENCE_PER_TIME_LIMIT,
  ) {
    this.limit = limit;
    this.perTimeLimit = perTimeLimit;
  }

  public clear(): void {
    this.entries.length = 0;
    this.dropped = 0;
    this.nextId = 1;
    this.lastNarTime = "";
    this.eventsAtTime = 0;
  }

  public reset(): void { this.clear(); }

  public push(event: Omit<ExperienceEvent, "id">): ExperienceEvent | null {
    if (event.narTime === this.lastNarTime) this.eventsAtTime += 1;
    else {
      this.lastNarTime = event.narTime;
      this.eventsAtTime = 1;
    }
    if (this.eventsAtTime > this.perTimeLimit) {
      this.dropped += 1;
      return null;
    }

    const retained = { ...event, id: this.nextId++ };
    this.entries.push(retained);
    if (this.entries.length > this.limit) {
      this.entries.shift();
      this.dropped += 1;
    }
    return retained;
  }

  public snapshot(): readonly ExperienceEvent[] {
    return this.entries.slice();
  }

  public stats(): ExperienceBufferStats {
    return { retained: this.entries.length, dropped: this.dropped };
  }
}

export const EXPERIENCE_LABELS: Record<ExperienceKind, string> = {
  anticipation: "预期",
  confirmation: "确认",
  disappointment: "失望",
  derived: "派生任务",
  belief: "信念加入",
  goal: "目标加入",
  answer: "答案",
  operation: "操作",
};

export const EXPERIENCE_SOURCE_LABELS: Record<ExperienceSource, string> = {
  nars: "NARS 内部",
  input: "实验输入",
  prior: "预置规则",
  babble: "Babble 探索",
};

export function experienceKindLabel(kind: ExperienceKind): string {
  return EXPERIENCE_LABELS[kind];
}

export function experienceSourceLabel(source: ExperienceSource): string {
  return EXPERIENCE_SOURCE_LABELS[source];
}
