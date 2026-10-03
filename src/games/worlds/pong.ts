import { dedupe, normalizeAction, clamp } from "../shared.ts";
import type { DemoDefinition, DemoStepResult, NarsStep, PongState } from "../types.ts";

export const definition: DemoDefinition = {
  title: "NARS Pong",
  subtitle: "经典球拍预测",
  actions: ["^Left", "^Right"],
  babble: 0.08,
  cycles: 10,
  narsPriorRules: [
    "<(&/,<right --> [on]>,(^Right,{SELF})) =/> <{SELF} --> [good]>>.",
    "<(&/,<left --> [on]>,(^Left,{SELF})) =/> <{SELF} --> [good]>>.",
  ],
  narsPriorNote: "球位与移动方向的两条因果规则是预置知识；NARS 根据当前感知执行操作，不声称从零学出规则。",
  source: "OpenNARS Lab / Pong.java",
  url: "https://github.com/opennars/opennars-lab/blob/master/src/main/java/org/opennars/lab/microworld/Pong.java",
  license: "GPL-3.0-or-later",
};

export function create(seed: number): PongState {
  return { game: "pong", seed, tick: 0, paddleX: 400, ballX: 400, ballY: 300, ballVX: 3, ballVY: 5, hits: 0, misses: 0, lastSense: "", lastInput: "", reward: 0, pendingFeedback: [] };
}

export function buildNarsStep(state: PongState): NarsStep {
  let sense = "middle";
  const feedback = [...state.pendingFeedback];
  state.pendingFeedback = [];
  if (Math.abs(state.paddleX - state.ballX) < 20 && state.ballY < 120) feedback.push("<{SELF} --> [good]>. :|:");
  else if (state.paddleX < state.ballX) sense = "right";
  else if (state.paddleX > state.ballX) sense = "left";
  const beliefs = sense !== state.lastSense || state.tick % 20 === 0 ? [`<${sense} --> [on]>. :|:`] : [];
  const goals = state.tick % 4 === 0 ? ["<{SELF} --> [good]>! :|:"] : [];
  state.lastSense = sense;
  return { beliefs: dedupe(beliefs), goals, feedback: dedupe(feedback), cycles: definition.cycles };
}

export function advance(state: PongState, rawAction: string | null, manualControl: string | null): DemoStepResult {
  const action = normalizeAction(rawAction);
  const direction = manualControl === "left" ? -1 : manualControl === "right" ? 1
    : action === "left" ? -1 : action === "right" ? 1 : 0;
  state.reward = 0;
  state.paddleX = clamp(state.paddleX + direction * 10, 0, 800);
  state.ballX += state.ballVX;
  state.ballY += state.ballVY;
  if (state.ballX < 8 || state.ballX > 792) { state.ballX = clamp(state.ballX, 8, 792); state.ballVX *= -1; }
  if (state.ballY > 592) { state.ballY = 592; state.ballVY *= -1; }
  const notes: string[] = [];
  const feedback: string[] = [];
  if (state.ballY < 8) {
    if (Math.abs(state.paddleX - state.ballX) < 40) {
      state.hits += 1;
      state.reward = 1;
      state.ballVY = Math.abs(state.ballVY);
      notes.push("PADDLE_HIT");
      feedback.push("<{SELF} --> [good]>. :|:");
    } else {
      state.misses += 1;
      state.ballVY = Math.abs(state.ballVY);
      notes.push("PADDLE_MISS");
    }
    state.ballY = 8;
  }
  state.pendingFeedback = feedback;
  state.tick += 1;
  return { notes, feedback, reward: state.reward };
}

export function applyManualControl(state: PongState, control: string): boolean {
  if (control === "left") state.paddleX = clamp(state.paddleX - 12, 0, 800);
  else if (control === "right") state.paddleX = clamp(state.paddleX + 12, 0, 800);
  else return false;
  return true;
}
