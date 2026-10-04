import { Events } from "@opennars/io/events/Events.ts";
import { OutputHandler } from "@opennars/io/events/OutputHandler.ts";
import type { Nar } from "@opennars/main/Nar.ts";
import {
  BoundedExperienceBuffer,
  type ExperienceEvent,
  type ExperienceKind,
  type ExperienceSource,
} from "./contract.ts";
import { readTopBeliefs } from "../diagnostics/reasoner-snapshot.ts";

type ExperiencePost = (event: ExperienceEvent) => void;

function safeText(value: unknown): string {
  if (value === undefined || value === null) return "";
  try {
    return String(value);
  } catch {
    return "[无法渲染事件对象]";
  }
}

function eventKey(value: unknown): unknown {
  if (value !== null && typeof value === "object") {
    const candidate = value as { sentence?: unknown; term?: unknown; getTerm?: () => unknown };
    if (candidate.sentence !== undefined) return candidate.sentence;
    if (candidate.term !== undefined) return candidate.term;
    if (typeof candidate.getTerm === "function") {
      try { return candidate.getTerm(); } catch { return value; }
    }
  }
  return value;
}

function classKey(value: unknown): unknown {
  const candidate = value as { class?: unknown } | null;
  return candidate !== null && (typeof value === "object" || typeof value === "function") && candidate.class !== undefined
    ? candidate.class
    : value;
}

/**
 * Bridges raw NARS events into the shared observatory contract. The recorder
 * records emitted events cheaply; the optional Top-N belief read is performed
 * only when the user opens the observatory.
 */
export class ExperienceRecorder {
  private readonly buffer = new BoundedExperienceBuffer();
  private phase: ExperienceSource = "input";
  private narTime = "0";
  private step = 0;

  public constructor(private readonly post: ExperiencePost) {}

  public setContext(source: ExperienceSource, narTime: string, step: number): void {
    this.phase = source;
    this.narTime = narTime;
    this.step = step;
  }

  public setNarTime(narTime: string): void {
    this.narTime = narTime;
  }

  public record(kind: ExperienceKind, value: unknown, evidence = "", source = this.phase): void {
    if (source !== "nars") return;
    const text = safeText(eventKey(value));
    if (text.length === 0) return;
    const event = this.buffer.push({
      kind,
      source,
      autonomous: true,
      narTime: this.narTime,
      text,
      evidence: evidence || text,
      step: this.step,
    });
    if (event !== null) this.post(event);
  }

  public snapshot(): readonly ExperienceEvent[] { return this.buffer.snapshot(); }

  public stats(): { retained: number; dropped: number } { return this.buffer.stats(); }

  public topBeliefs(reasoner: Nar, limit = 8) {
    return readTopBeliefs(reasoner as unknown as Parameters<typeof readTopBeliefs>[0], limit);
  }

  public reset(): void { this.buffer.clear(); }

  public attach(reasoner: Nar): void {
    const on = (eventType: unknown, kind: ExperienceKind, valueIndex = 0): void => {
      const key = classKey(eventType) as never;
      reasoner.on(key, {
        event: (_event: unknown, args: unknown[] = []) => {
          this.record(kind, args[valueIndex], `${kind}: ${safeText(args[valueIndex])}`);
        },
      });
    };
    on(OutputHandler.ANTICIPATE, "anticipation");
    on(OutputHandler.CONFIRM, "confirmation");
    on(OutputHandler.DISAPPOINT, "disappointment");
    on(Events.TaskDerive, "derived");
    on(Events.ConceptBeliefAdd, "belief", 1);
    on(Events.ConceptGoalAdd, "goal", 1);
    on(Events.Answer, "answer");
    on(OutputHandler.EXE, "operation");
  }

  public withPhase<T>(source: ExperienceSource, action: () => T): T {
    const previous = this.phase;
    this.phase = source;
    try { return action(); } finally { this.phase = previous; }
  }
}
