import { dedupe, normalizeAction, selfBelief, selfGoal, stepRandom, randomInt, clamp } from "../shared.ts";
import type { DemoDefinition, DemoStepResult, HuntState, NarsStep } from "../types.ts";

export const definition: DemoDefinition = {
  title: "Hunt 追捕",
  subtitle: "四方向追逐 / 差分感知",
  actions: ["^left", "^right", "^up", "^down"],
  babble: 0.08,
  cycles: 2,
  narsPriorRules: [
    "<(&/,<{SELF} --> [ball_left]>,(^left,{SELF})) =/> <{SELF} --> [good]>>.",
    "<(&/,<{SELF} --> [ball_right]>,(^right,{SELF})) =/> <{SELF} --> [good]>>.",
    "<(&/,<{SELF} --> [ball_up]>,(^up,{SELF})) =/> <{SELF} --> [good]>>.",
    "<(&/,<{SELF} --> [ball_down]>,(^down,{SELF})) =/> <{SELF} --> [good]>>.",
  ],
  narsPriorNote: "四个方向的感知—操作因果规则是预置知识；NARS 根据当前球的位置选择操作，不声称从零学出规则。",
  source: "NARust-o / examples/_games/hunt.rs",
  url: "https://github.com/ARCJ137442/NARust-o/blob/main/examples/_games/hunt.rs",
  license: "MIT / Apache-2.0 / ONA attribution",
};

export function create(seed: number): HuntState {
  const random = stepRandom(seed, -1);
  return { game: "hunt", seed, tick: 0, width: 50, height: 20, player: { x: 10, y: 10 }, ball: { x: 25, y: 4, vx: 0, vy: 1 }, ballEvery: 10, hits: 0, reward: 0, pendingFeedback: [], random: random() };
}

export function buildNarsStep(state: HuntState): NarsStep {
  const dx = state.ball.x - state.player.x;
  const dy = state.ball.y - state.player.y;
  const beliefs: string[] = [];
  if (dx < 0) beliefs.push(selfBelief("ball_left"));
  if (dx > 0) beliefs.push(selfBelief("ball_right"));
  if (dy < 0) beliefs.push(selfBelief("ball_up"));
  if (dy > 0) beliefs.push(selfBelief("ball_down"));
  const feedback = [...state.pendingFeedback];
  state.pendingFeedback = [];
  if (dx === 0 && dy === 0) feedback.push(selfBelief("good"));
  return { beliefs: dedupe(beliefs), goals: [selfGoal("good")], feedback: dedupe(feedback), cycles: definition.cycles };
}

export function advance(state: HuntState, rawAction: string | null): DemoStepResult {
  const random = stepRandom(state.seed, state.tick);
  const action = normalizeAction(rawAction);
  const notes: string[] = [];
  const feedback: string[] = [];
  state.reward = 0;
  if (action === "left") state.player.x -= 1;
  if (action === "right") state.player.x += 1;
  if (action === "up") state.player.y -= 1;
  if (action === "down") state.player.y += 1;
  state.player.x = clamp(state.player.x, 0, state.width - 1);
  state.player.y = clamp(state.player.y, 0, state.height - 1);
  if (state.tick % state.ballEvery === 0) {
    if (state.ball.vx === 0 && state.ball.vy === 0) { state.ball.vx = randomInt(random, -1, 1); state.ball.vy = randomInt(random, -1, 1); }
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;
    if (state.ball.x < 0 || state.ball.x >= state.width) state.ball.vx *= -1;
    if (state.ball.y < 0 || state.ball.y >= state.height) state.ball.vy *= -1;
    state.ball.x = clamp(state.ball.x, 0, state.width - 1);
    state.ball.y = clamp(state.ball.y, 0, state.height - 1);
  }
  if (state.ball.x === state.player.x && state.ball.y === state.player.y) {
    state.hits += 1;
    state.reward = 1;
    feedback.push(selfBelief("good"));
    state.ball.x = randomInt(random, 0, state.width - 1);
    state.ball.y = randomInt(random, 0, state.height - 1);
    state.ball.vx = randomInt(random, -1, 1);
    state.ball.vy = randomInt(random, -1, 1);
    notes.push("TARGET_CAUGHT");
  }
  state.pendingFeedback = feedback;
  state.tick += 1;
  return { notes, feedback, reward: state.reward };
}

export function applyManualControl(state: HuntState, control: string): boolean {
  const delta = {
    left: [-1, 0],
    right: [1, 0],
    up: [0, -1],
    down: [0, 1],
  }[control];
  if (!delta) return false;
  state.player.x = clamp(state.player.x + delta[0], 0, state.width - 1);
  state.player.y = clamp(state.player.y + delta[1], 0, state.height - 1);
  return true;
}
