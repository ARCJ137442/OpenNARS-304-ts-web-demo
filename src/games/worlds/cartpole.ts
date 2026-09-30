import { dedupe, normalizeAction, selfBelief, selfGoal, clamp } from "../shared.ts";
import type { CartPoleState, DemoDefinition, DemoStepResult, NarsStep } from "../types.ts";

export const definition: DemoDefinition = {
  title: "CartPole 平衡",
  subtitle: "离散控制 / 连续状态",
  actions: ["^left", "^right"],
  babble: 0.08,
  cycles: 10,
  source: "NARust-o / examples/_games/cartpole.rs",
  url: "https://github.com/ARCJ137442/NARust-o/blob/main/examples/_games/cartpole.rs",
  license: "MIT / Apache-2.0 / ONA attribution",
};

export function create(seed: number): CartPoleState {
  return { game: "cartpole", seed, tick: 0, position: 0, velocity: 0, angle: -Math.PI / 2, angleVelocity: 0, maxAngleVelocity: 0.3, successes: 0, failures: 0, reward: 0, pendingFeedback: [] };
}

export function buildNarsStep(state: CartPoleState): NarsStep {
  const encoding = Math.round(((state.angle + Math.PI) / (Math.PI * 2)) * 8);
  const feedback = [...state.pendingFeedback];
  state.pendingFeedback = [];
  if (Math.abs(state.angle + Math.PI / 2) <= 0.5) feedback.push(selfBelief("good"));
  return { beliefs: [selfBelief("angle" + encoding)], goals: [selfGoal("good")], feedback: dedupe(feedback), cycles: definition.cycles };
}

export function advance(state: CartPoleState, rawAction: string | null): DemoStepResult {
  const action = normalizeAction(rawAction);
  state.reward = 0;
  if (action === "left") { const reverse = Math.sign(state.angle); state.angleVelocity -= reverse * 0.2; state.velocity -= 0.1; }
  if (action === "right") { const reverse = Math.sign(state.angle); state.angleVelocity += reverse * 0.2; state.velocity += 0.1; }
  state.position = clamp(state.position + state.velocity, 0, 1);
  state.angle += state.angleVelocity;
  state.angleVelocity = clamp(state.angleVelocity + 0.2 * Math.cos(state.angle), -state.maxAngleVelocity, state.maxAngleVelocity);
  if (state.angle > Math.PI) state.angle = -Math.PI;
  if (state.angle < -Math.PI) state.angle = Math.PI;
  state.velocity = 0;
  if (Math.abs(state.angle + Math.PI / 2) <= 0.5) { state.successes += 1; state.reward = 1; }
  else if (state.angle >= 0 && state.angle <= Math.PI) state.failures += 1;
  state.tick += 1;
  return { notes: [], feedback: [], reward: state.reward };
}

export function applyManualControl(state: CartPoleState, control: string): boolean {
  if (control === "left") { state.angleVelocity -= Math.sign(state.angle) * 0.2; state.velocity -= 0.1; }
  else if (control === "right") { state.angleVelocity += Math.sign(state.angle) * 0.2; state.velocity += 0.1; }
  else return false;
  return true;
}
