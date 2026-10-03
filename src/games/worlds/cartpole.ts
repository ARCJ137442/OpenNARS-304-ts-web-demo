import { dedupe, normalizeAction, selfBelief, selfGoal, clamp } from "../shared.ts";
import type { CartPoleState, DemoDefinition, DemoStepResult, NarsStep } from "../types.ts";

export const definition: DemoDefinition = {
  title: "CartPole 平衡",
  subtitle: "离散控制 / 连续状态",
  actions: ["^left", "^right"],
  babble: 0.08,
  cycles: 10,
  narsPriorRules: [
    "<(&/,<{SELF} --> [tilt_right]>,(^left,{SELF})) =/> <{SELF} --> [good]>>.",
    "<(&/,<{SELF} --> [tilt_left]>,(^right,{SELF})) =/> <{SELF} --> [good]>>.",
  ],
  narsPriorNote: "左右倾斜与反向施力的因果规则是预置知识；good 反馈只在操作后的世界结果中提交。",
  source: "NARust-o / examples/_games/cartpole.rs",
  url: "https://github.com/ARCJ137442/NARust-o/blob/main/examples/_games/cartpole.rs",
  license: "MIT / Apache-2.0 / ONA attribution",
};

export function create(seed: number): CartPoleState {
  // Angle zero is the upright balance point. A small positive perturbation
  // makes the no-action trajectory visibly fall under gravity toward down.
  return { game: "cartpole", seed, tick: 0, position: 0, velocity: 0, angle: 0.08, angleVelocity: 0, maxAngleVelocity: 0.3, successes: 0, failures: 0, reward: 0, pendingFeedback: [] };
}

export function buildNarsStep(state: CartPoleState): NarsStep {
  const feedback = [...state.pendingFeedback];
  state.pendingFeedback = [];
  return { beliefs: [selfBelief(state.angle < 0 ? "tilt_left" : "tilt_right")],
    goals: [selfGoal("good")], feedback: dedupe(feedback), cycles: definition.cycles };
}

export function advance(state: CartPoleState, rawAction: string | null): DemoStepResult {
  const action = normalizeAction(rawAction);
  const acted = action === "left" || action === "right";
  const previousDeviation = Math.abs(state.angle);
  state.reward = 0;
  if (action === "left") { state.angleVelocity -= 0.12; state.velocity -= 0.1; }
  if (action === "right") { state.angleVelocity += 0.12; state.velocity += 0.1; }
  state.position = clamp(state.position + state.velocity, 0, 1);
  state.angle += state.angleVelocity;
  // Gravity destabilizes the upright point and pulls the pole toward +/-PI.
  state.angleVelocity = clamp(state.angleVelocity + 0.2 * Math.sin(state.angle), -state.maxAngleVelocity, state.maxAngleVelocity);
  if (state.angle > Math.PI) state.angle = -Math.PI;
  if (state.angle < -Math.PI) state.angle = Math.PI;
  state.velocity = 0;
  if (Math.abs(state.angle) <= 0.5) {
    state.successes += 1;
    state.reward = 1;
    if (acted && Math.abs(state.angle) < previousDeviation) {
      state.pendingFeedback.push(selfBelief("good"));
    }
  }
  else if (Math.abs(state.angle) >= Math.PI / 2) state.failures += 1;
  state.tick += 1;
  return { notes: [], feedback: [], reward: state.reward };
}

export function applyManualControl(state: CartPoleState, control: string): boolean {
  if (control === "left") { state.angleVelocity -= 0.12; state.velocity -= 0.1; }
  else if (control === "right") { state.angleVelocity += 0.12; state.velocity += 0.1; }
  else return false;
  return true;
}
