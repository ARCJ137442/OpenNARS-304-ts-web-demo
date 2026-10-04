/* GPL-3.0-or-later NARS sensorimotor demonstration adapter. */
import { Events } from "@opennars/io/events/Events.ts";
import { OutputHandler } from "@opennars/io/events/OutputHandler.ts";
import { Nar } from "@opennars/main/Nar.ts";
import { Debug } from "@opennars/main/Debug.ts";
import { Operator } from "@opennars/operator/Operator.ts";
import { type Operation } from "@opennars/operator/Operation.ts";
import { type Term } from "@opennars/language/Term.ts";
import { type Memory } from "@opennars/storage/Memory.ts";
import { type Timable } from "@opennars/interfaces/Timable.ts";
import { type Task } from "@opennars/entity/Task.ts";
import { readReasonerSnapshot } from "./diagnostics/reasoner-snapshot.ts";
import { ExperienceRecorder } from "./experience/worker-recorder.ts";
import type { ExperienceEvent } from "./experience/contract.ts";

type WorkerMessage =
  | { type: "init"; game: string; seed: number; actions: string[]; priorRules?: string[] }
  | { type: "step"; game: string; step: number; beliefs?: string[]; goals?: string[]; feedback?: string[]; cycles?: number; babble?: number }
  | { type: "experience-snapshot" };

const ACTIONS = ["^Left", "^Right", "^Idle", "^Forward", "^Shoot", "^Pick", "^Drop", "^Up", "^Down", "^left", "^right", "^up", "^down", "^shoot", "^pick", "^drop", "^fire", "^activate", "^cell0", "^cell1", "^cell2", "^cell3", "^cell4", "^cell5", "^cell6", "^cell7", "^cell8", "^move", "^turn_left", "^turn_right", "^ping", "^stop"] as const;
let nar: Nar | null = null;
let enabledActions = new Set<string>();
let operationThisStep: string | null = null;
let randomState = 1;
const experienceRecorder = new ExperienceRecorder((event: ExperienceEvent) => post("experience", { event }));

function random(): number {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 0x1_0000_0000;
}

const post = (type: string, payload: Record<string, unknown> = {}): void => self.postMessage({ type, ...payload });

class DemoOperator extends Operator {
  constructor(private readonly action: string) { super(action); }

  protected execute(_operation: Operation, _args: Term[], memory: Memory, _time: Timable): Task[] | null {
    operationThisStep = this.action;
    memory.allowExecution = false;
    experienceRecorder.record("operation", this.action, `EXE: ${this.action}`);
    post("operation", { action: this.action, status: "executed" });
    return null;
  }
}

function initialize(game: string, seed: number, actions: string[], priorRules: string[]): void {
  nar?.stop();
  randomState = Number(seed) >>> 0 || 1;
  enabledActions = new Set(actions.filter((action) => (ACTIONS as readonly string[]).includes(action)));
  operationThisStep = null;
  experienceRecorder.reset();
  Debug.TEST = true;
  nar = new Nar();
  experienceRecorder.attach(nar);
  nar.narParameters.VOLUME = 0;
  for (const action of enabledActions) nar.addPlugin(new DemoOperator(action));

  nar.on(OutputHandler.EXE.class, {
    event(_event: unknown, args: unknown[] = []) {
      const value = args[0];
      post("log", { kind: "EXE", game, text: value === undefined ? "EXE" : String(value) });
    },
  });
  nar.on(Events.UnexecutableOperation.class, {
    event(_event: unknown, args: unknown[] = []) {
      post("log", { kind: "UNEXECUTABLE", game, text: args.map(String).join(" ") });
    },
  });
  nar.on(Events.Answer.class, {
    event(_event: unknown, args: unknown[] = []) {
      post("log", { kind: "ANSWER", game, text: args.map(String).join(" ") });
    },
  });
  for (const rule of priorRules) {
    experienceRecorder.withPhase("prior", () => nar?.addInput(rule));
    post("log", { kind: "PRIOR", game, text: rule });
  }
  experienceRecorder.setContext("input", String(nar.time()), 0);
  post("ready", { game, actions: [...enabledActions] });
  post("experience-reset");
}

function runStep(message: Extract<WorkerMessage, { type: "step" }>): void {
  if (!nar) throw new Error("Demo worker is not initialized");
  const startedAt = performance.now();
  operationThisStep = null;
  experienceRecorder.setContext("input", String(nar.time()), message.step);
  for (const [kind, values] of [["SENSOR", message.beliefs], ["GOAL", message.goals], ["FEEDBACK", message.feedback]] as const) {
    for (const text of values ?? []) {
      nar.addInput(text);
      post("log", { kind, game: message.game, step: message.step, text });
    }
  }

  const cycles = Math.max(1, Math.min(250, Math.floor(message.cycles ?? 10)));
  experienceRecorder.setContext("nars", String(nar.time()), message.step);
  experienceRecorder.withPhase("nars", () => nar?.cycles(cycles));
  experienceRecorder.setNarTime(String(nar.time()));
  let action: string | null = operationThisStep;
  let source = action ? "NARS" : "idle";
  if (!action && random() < Math.max(0, Math.min(0.5, message.babble ?? 0))) {
    const candidates = [...enabledActions];
    if (candidates.length > 0) {
      action = candidates[Math.floor(random() * candidates.length)];
      source = "babble";
      const babbleAction = action;
      experienceRecorder.withPhase("babble", () => nar?.addInput(`${babbleAction.slice(1)}({SELF}). :|:`));
      post("log", { kind: "BABBLE", game: message.game, step: message.step, text: action });
    }
  }

  post("step-complete", {
    game: message.game,
    step: message.step,
    action,
    source,
    cycles,
    narTime: String(nar.time()),
    elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
    reasoner: readReasonerSnapshot(nar),
  });
}

self.addEventListener("message", ({ data }: MessageEvent<WorkerMessage>) => {
  try {
    if (data?.type === "init") initialize(data.game, data.seed, data.actions, data.priorRules ?? []);
    else if (data?.type === "step") runStep(data);
    else if (data?.type === "experience-snapshot") post("experience-snapshot", { events: experienceRecorder.snapshot(), stats: experienceRecorder.stats() });
  } catch (error) {
    post("fault", { game: data && "game" in data ? data.game : "unknown", message: error instanceof Error ? error.message : String(error) });
  }
});

post("booting");
