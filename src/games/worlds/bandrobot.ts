import { dedupe, normalizeAction, selfBelief, selfGoal, seededRandom, stepRandom, clamp } from "../shared.ts";
import type { BandRobotState, DemoDefinition, DemoStepResult, NarsStep } from "../types.ts";

export const definition: DemoDefinition = {
  title: "BandRobot 搬运",
  subtitle: "抓取 / 运输 / 放置",
  actions: ["^left", "^right", "^pick", "^drop"],
  babble: 0.1,
  cycles: 10,
  source: "NARust-o / examples/_games/bandrobot.rs",
  url: "https://github.com/ARCJ137442/NARust-o/blob/main/examples/_games/bandrobot.rs",
  license: "MIT / Apache-2.0 / ONA attribution",
};

export function create(seed: number): BandRobotState {
  return { game: "bandrobot", seed, tick: 0, position: 0, target: 3, goal: 16, picked: false, successes: 0, lastPicked: false, reward: 0, pendingFeedback: [] };
}

export function buildNarsStep(state: BandRobotState): NarsStep {
  const property = state.picked ? "dropPosX" : "pickPosX";
  const target = state.picked ? state.goal : state.target;
  const beliefs = [
    "<position" + state.position + " --> [" + property + "]>. :|:",
    "<target" + target + " --> [" + property + "]>. :|:",
  ];
  if (state.picked && !state.lastPicked) beliefs.push(selfBelief("picked"));
  const feedback = [...state.pendingFeedback];
  state.pendingFeedback = [];
  state.lastPicked = state.picked;
  return { beliefs: dedupe(beliefs), goals: [selfGoal("delivered")], feedback: dedupe(feedback), cycles: definition.cycles };
}

export function advance(state: BandRobotState, rawAction: string | null): DemoStepResult {
  const random = stepRandom(state.seed, state.tick);
  const action = normalizeAction(rawAction);
  const notes: string[] = [];
  const feedback: string[] = [];
  state.reward = 0;
  if (action === "left") state.position -= 1;
  if (action === "right") state.position += 1;
  state.position = clamp(state.position, 0, 20);
  if (state.picked) state.target = state.position;
  if (action === "pick" && state.position === state.target) { state.picked = true; notes.push("PICKED"); }
  if (action === "drop" && state.picked) {
    state.picked = false;
    if (state.position === state.goal) {
      state.successes += 1;
      state.reward = 1;
      feedback.push("1.", selfBelief("delivered"));
      notes.push("DELIVERED");
      state.goal = Math.round(random() * 20);
      state.target = Math.round(random() * 20);
    } else notes.push("DROPPED");
  }
  state.pendingFeedback = feedback;
  state.tick += 1;
  return { notes, feedback, reward: state.reward };
}

export function applyManualControl(state: BandRobotState, control: string): boolean {
  if (control === "left") state.position = clamp(state.position - 1, 0, 20);
  else if (control === "right") state.position = clamp(state.position + 1, 0, 20);
  else if (control === "pick" && state.position === state.target) { state.picked = true; state.pendingFeedback.push(selfBelief("picked")); }
  else if (control === "drop" && state.picked) {
    state.picked = false;
    if (state.position === state.goal) {
      state.successes += 1;
      state.pendingFeedback.push("1.", selfBelief("delivered"));
      const random = seededRandom((state.seed ^ state.tick ^ state.successes) >>> 0);
      state.goal = Math.round(random() * 20);
      state.target = Math.round(random() * 20);
    }
  } else return false;
  return true;
}
