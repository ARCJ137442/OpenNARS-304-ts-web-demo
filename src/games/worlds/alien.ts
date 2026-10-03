import { dedupe, normalizeAction, selfBelief, selfGoal, seededRandom, stepRandom, clamp } from "../shared.ts";
import type { AlienState, DemoDefinition, DemoStepResult, NarsStep } from "../types.ts";

export const definition: DemoDefinition = {
  title: "Alien 拦截",
  subtitle: "移动 / 瞄准 / 射击",
  actions: ["^left", "^right", "^shoot"],
  babble: 0.1,
  cycles: 10,
  narsPriorRules: [
    "<(&/,<{SELF} --> [left]>,(^right,{SELF})) =/> <{SELF} --> [shoot]>>.",
    "<(&/,<{SELF} --> [right]>,(^left,{SELF})) =/> <{SELF} --> [shoot]>>.",
    "<(&/,<{SELF} --> [center]>,(^shoot,{SELF})) =/> <{SELF} --> [shoot]>>.",
  ],
  narsPriorNote: "朝目标移动与居中射击的因果规则是预置知识；NARS 仍依据当前感知决定是否执行操作。",
  source: "NARust-o / examples/_games/alien.rs",
  url: "https://github.com/ARCJ137442/NARust-o/blob/main/examples/_games/alien.rs",
  license: "MIT / Apache-2.0 / ONA attribution",
};

export function create(seed: number): AlienState {
  return { game: "alien", seed, tick: 0, alienX: 0.5, alienV: 0.003, defenderX: 0.5, shots: 0, hits: 0, reward: 0, pendingFeedback: [] };
}

export function buildNarsStep(state: AlienState): NarsStep {
  const conditionLeft = state.defenderX <= state.alienX - 0.18;
  const conditionRight = state.defenderX > state.alienX + 0.18;
  const beliefs = [selfBelief(conditionLeft ? "left" : conditionRight ? "right" : "center")];
  const feedback = [...state.pendingFeedback];
  state.pendingFeedback = [];
  return { beliefs: dedupe(beliefs), goals: [selfGoal("shoot")], feedback: dedupe(feedback), cycles: definition.cycles };
}

export function advance(state: AlienState, rawAction: string | null): DemoStepResult {
  const random = stepRandom(state.seed, state.tick);
  const action = normalizeAction(rawAction);
  const notes: string[] = [];
  const feedback: string[] = [];
  state.reward = 0;
  state.alienX += state.alienV;
  if (state.alienX < 0.05 || state.alienX > 0.95) state.alienV *= -1;
  if (action === "left") state.defenderX = clamp(state.defenderX - 0.1, 0, 1);
  if (action === "right") state.defenderX = clamp(state.defenderX + 0.1, 0, 1);
  if (action === "shoot") {
    state.shots += 1;
    if (Math.abs(state.defenderX - state.alienX) < 0.18) {
      state.hits += 1;
      state.reward = 1;
      feedback.push(selfBelief("hit"));
      state.alienX = random();
      notes.push("HIT");
    } else notes.push("MISS");
  }
  state.pendingFeedback = feedback;
  state.tick += 1;
  return { notes, feedback, reward: state.reward };
}

export function applyManualControl(state: AlienState, control: string): boolean {
  if (control === "left") state.defenderX = clamp(state.defenderX - 0.06, 0, 1);
  else if (control === "right") state.defenderX = clamp(state.defenderX + 0.06, 0, 1);
  else if (control === "shoot") {
    state.shots += 1;
    if (Math.abs(state.defenderX - state.alienX) < 0.18) {
      state.hits += 1;
      state.pendingFeedback.push(selfBelief("hit"));
      state.alienX = seededRandom((state.seed ^ state.tick ^ state.shots) >>> 0)();
    }
  } else return false;
  return true;
}
