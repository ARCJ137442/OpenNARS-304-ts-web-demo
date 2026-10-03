/*
 * GPL-3.0-or-later adaptation of the active SimNAR NARS bridge.
 * See COPYING-GPL-3.0.txt and docs/microworld-demo-implementation-plan.md.
 */

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

type ActionCode = 0 | 1 | 2 | 3;
type OperationName = "^Right" | "^Left" | "^Forward";
type StepMessage = {
  type: "step";
  sensors: number[];
  reward: number;
  seed: number;
  cycles?: number;
  babble?: number;
  priorRules?: readonly string[];
};
type ResetMessage = { type: "reset"; seed: number; priorRules?: readonly string[] };

const DEFAULT_STEP_CYCLES = 10;
const DEFAULT_BABBLE_PROBABILITY = 0.1;
const ACTIONS: Array<{ name: OperationName; code: ActionCode }> = [
  { name: "^Right", code: 1 },
  { name: "^Left", code: 2 },
  { name: "^Forward", code: 3 },
];

let nar: Nar | null = null;
let stepNumber = 0;
let lastSensorInputs = new Set<string>();
let pendingAction: { name: OperationName; code: ActionCode } | null = null;
let randomState = 0x6d2b79f5;

const post = (type: string, payload: Record<string, unknown> = {}): void => {
  self.postMessage({ type, ...payload });
};

function setSeed(seed: number): void {
  randomState = Number(seed) >>> 0 || 0x6d2b79f5;
}

function random(): number {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 0x1_0000_0000;
}

class MicroworldOperator extends Operator {
  private readonly actionName: OperationName;
  private readonly actionCode: ActionCode;

  constructor(action: { name: OperationName; code: ActionCode }) {
    super(action.name);
    this.actionName = action.name;
    this.actionCode = action.code;
  }

  protected execute(_operation: Operation, _args: Term[], memory: Memory, _time: Timable): Task[] | null {
    pendingAction = { name: this.actionName, code: this.actionCode };
    memory.allowExecution = false;
    post("operation", {
      operator: this.actionName,
      action: this.actionCode,
      source: "NARS",
      step: stepNumber,
      status: "executed",
    });
    return null;
  }
}

function createNar(seed: number, priorRules: readonly string[] = []): void {
  setSeed(seed ^ 0x4e415253);
  stepNumber = 0;
  lastSensorInputs = new Set<string>();
  pendingAction = null;
  Debug.TEST = true;
  nar = new Nar();
  nar.narParameters.VOLUME = 0;

  for (const action of ACTIONS) nar.addPlugin(new MicroworldOperator(action));

  const eventLog = (kind: string) => ({
    event(_event: unknown, args: unknown[] = []) {
      const entry = args[0];
      post("log", {
        kind,
        text: entry === undefined ? kind : String(entry),
        step: stepNumber,
      });
    },
  });
  nar.on(OutputHandler.EXE.class, eventLog("EXE"));
  nar.on(Events.UnexecutableOperation.class, eventLog("UNEXECUTABLE"));
  nar.on(Events.Answer.class, eventLog("ANSWER"));
  for (const rule of priorRules) submit(rule, "PRIOR");
}

function submit(text: string, kind: string): void {
  if (!nar) return;
  nar.addInput(text);
  post("log", { kind, text, step: stepNumber });
}

function runStep(message: StepMessage): void {
  if (!nar) createNar(message.seed, message.priorRules);
  if (!nar) return;

  const start = performance.now();
  pendingAction = null;
  const sensorValues = Array.from({ length: 6 }, (_, index) => {
    const value = Number(message.sensors?.[index] ?? 0);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  });

  const currentSensorInputs = new Set<string>();
  for (let index = 0; index < sensorValues.length; index += 1) {
    if (sensorValues[index] <= 0.1) continue;
    const input = `<{${index}} --> [on]>. :|:`;
    currentSensorInputs.add(input);
    if (!lastSensorInputs.has(input) || stepNumber % 5 === 0) submit(input, "SENSOR");
  }
  lastSensorInputs = currentSensorInputs;

  stepNumber += 1;
  if (stepNumber % 2 === 0) {
    submit(stepNumber % 10 === 0
      ? "<{SELF} --> [healthy]>! :|:"
      : "<{SELF} --> [satisfied]>! :|:", "GOAL");
  }

  const reward = Math.sign(Number(message.reward) || 0);
  if (reward > 0) submit("<{SELF} --> [satisfied]>. :|:", "REWARD_GOOD");
  if (reward < 0) {
    submit("<{SELF} --> [satisfied]>. :|: %0%", "REWARD_BAD");
    submit("<{SELF} --> [healthy]>. :|: %0%", "REWARD_BAD");
  }
  if (stepNumber > 200 && stepNumber % 20 === 0) {
    submit("<{SELF} --> [healthy]>. :|:", "HEALTH");
  }

  const cycles = Math.max(1, Math.min(1000, Math.floor(message.cycles ?? DEFAULT_STEP_CYCLES)));
  const babbleProbability = Math.max(0, Math.min(0.5, message.babble ?? DEFAULT_BABBLE_PROBABILITY));
  nar.cycles(cycles);

  let action: { name: OperationName; code: ActionCode } | null = pendingAction;
  let actionSource = action ? "NARS" : "idle";
  if (!action && random() < babbleProbability) {
    const sampled = Math.floor(random() * 4) as ActionCode;
    if (sampled !== 0) {
      action = ACTIONS.find((candidate) => candidate.code === sampled) ?? null;
      actionSource = "babble";
      if (action) submit(`${action.name.slice(1)}({SELF}). :|:`, "BABBLE");
    }
  }
  const result = {
    action: action?.code ?? 0,
    operator: action?.name ?? null,
    actionSource,
    step: stepNumber,
    cycles,
    narTime: String(nar.time()),
    elapsedMs: Number((performance.now() - start).toFixed(2)),
    sensors: sensorValues,
    reward,
    executed: pendingAction !== null,
    reasoner: readReasonerSnapshot(nar),
  };
  post("step-complete", result);
}

self.addEventListener("message", ({ data }: MessageEvent<StepMessage | ResetMessage>) => {
  try {
    if (data?.type === "reset") {
      createNar(data.seed, data.priorRules);
      post("ready", { step: 0, cyclesPerStep: DEFAULT_STEP_CYCLES });
    } else if (data?.type === "step") {
      runStep(data);
    }
  } catch (error) {
    post("fault", {
      message: error instanceof Error ? error.message : String(error),
      step: stepNumber,
    });
  }
});

post("booting", { cyclesPerStep: DEFAULT_STEP_CYCLES });
