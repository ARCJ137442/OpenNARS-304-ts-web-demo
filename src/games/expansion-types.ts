export type ExpansionId = "tictactoe" | "shot" | "testchamber" | "fighterplane";
export type ExpansionDefinition = {
  id: ExpansionId;
  title: string;
  subtitle: string;
  actions: readonly string[];
  cycles: number;
  source: string;
  url: string;
  license: string;
};
export type ExpansionNarsStep = { beliefs: string[]; goals: string[]; feedback: string[]; cycles: number };
export type ExpansionResult = { notes: string[]; feedback: string[]; reward: number };
export type BaseExpansionState<G extends ExpansionId> = {
  game: G; seed: number; tick: number; reward: number; pendingFeedback: string[];
};
export type TicTacToeState = BaseExpansionState<"tictactoe"> & {
  board: Array<"x" | "o" | null>; turn: "x" | "o"; winner: "x" | "o" | "draw" | null; moves: number;
};
export type ShotState = BaseExpansionState<"shot"> & {
  playerX: number; targetX: number; targetY: number; targetV: number; shots: number; hits: number; misses: number;
};
export type TestChamberState = BaseExpansionState<"testchamber"> & {
  width: number; height: number; player: { x: number; y: number }; item: { x: number; y: number; active: boolean };
  switch: { x: number; y: number; active: boolean }; carrying: boolean; delivered: number;
};
export type FighterPlaneState = BaseExpansionState<"fighterplane"> & {
  width: number; height: number; player: { x: number; y: number; hp: number };
  enemy: { x: number; y: number; vx: number; hp: number }; cooldown: number; hits: number; crashes: number;
};
export type ExpansionState = TicTacToeState | ShotState | TestChamberState | FighterPlaneState;
