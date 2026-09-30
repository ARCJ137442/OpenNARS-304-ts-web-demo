import type { ExpansionState } from "./expansion-types.ts";

export const DEMO_IDS = ["pong", "alien", "bandrobot", "cartpole", "hunt", "tictactoe", "shot", "testchamber", "fighterplane"] as const;
export type DemoId = (typeof DEMO_IDS)[number];
export type ActionName = "^Left" | "^Right" | "^Forward" | "^Shoot" | "^Pick" | "^Drop" | "^Up" | "^Down" | "^left" | "^right" | "^shoot" | "^pick" | "^drop" | "^up" | "^down" | "^fire" | "^activate" | "^cell0" | "^cell1" | "^cell2" | "^cell3" | "^cell4" | "^cell5" | "^cell6" | "^cell7" | "^cell8";
export type DemoDefinition = {
  title: string;
  subtitle: string;
  actions: readonly string[];
  babble: number;
  cycles: number;
  source: string;
  url: string;
  license: string;
};

type BaseState<G extends DemoId> = { game: G; seed: number; tick: number; reward: number; pendingFeedback: string[] };
export type PongState = BaseState<"pong"> & { paddleX: number; ballX: number; ballY: number; ballVX: number; ballVY: number; hits: number; misses: number; lastSense: string; lastInput: string };
export type AlienState = BaseState<"alien"> & { alienX: number; alienV: number; defenderX: number; shots: number; hits: number };
export type BandRobotState = BaseState<"bandrobot"> & { position: number; target: number; goal: number; picked: boolean; successes: number; lastPicked: boolean };
export type CartPoleState = BaseState<"cartpole"> & { position: number; velocity: number; angle: number; angleVelocity: number; maxAngleVelocity: number; successes: number; failures: number };
export type HuntState = BaseState<"hunt"> & { width: number; height: number; player: { x: number; y: number }; ball: { x: number; y: number; vx: number; vy: number }; ballEvery: number; hits: number; random: number };
export type DemoState = PongState | AlienState | BandRobotState | CartPoleState | HuntState | ExpansionState;
export type StateFor<G extends DemoId> = Extract<DemoState, { game: G }>;
export type NarsStep = { beliefs: string[]; goals: string[]; feedback: string[]; cycles: number };
export type DemoStepResult = { notes: string[]; feedback: string[]; reward: number };
