import type { EchoDirection, EchoRelayState, ExpansionDefinition, ExpansionNarsStep, ExpansionResult } from "../../expansion-types.ts";

const WIDTH = 9;
const HEIGHT = 7;
const PULSE_CAPACITY = 8;
const PLAYER_CAPACITY = 36;
const DIRS: Record<EchoDirection, { x: number; y: number }> = {
  north: { x: 0, y: -1 }, east: { x: 1, y: 0 }, south: { x: 0, y: 1 }, west: { x: -1, y: 0 },
};
const CLOCKWISE: EchoDirection[] = ["north", "east", "south", "west"];
const TEMPLATE = [
  "#########",
  "#.......#",
  "#.#.###.#",
  "#.#.....#",
  "#.#####.#",
  "#.......#",
  "#########",
];
const goal = "<{SELF} --> [signal_at_beacon]>! :|:";
const belief = (property: string) => `<{SELF} --> [${property}]>. :|:`;

export const definition: ExpansionDefinition = {
  id: "echo-relay", title: "Echo Relay", subtitle: "回声探测 / 能量管理 / 迷宫导航",
  actions: ["^move", "^turn_left", "^turn_right", "^ping"], cycles: 10,
  source: "Original OpenNARS 3.0.4 sensorimotor experiment", url: "https://github.com/ARCJ137442/OpenNARS-304-ts-web-demo",
  license: "Original TypeScript implementation",
  narsPriorRules: ["<(&/,<{SELF} --> [pulse_available]>,(^ping,{SELF})) =/> <{SELF} --> [signal_at_beacon]>>."],
  narsPriorNote: "含预置领域规则与因果假设，不是从空白自主学出。",
};

function seedBits(seed: number): number {
  let value = Number(seed) >>> 0;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  return value >>> 0;
}
function cellIndex(state: Pick<EchoRelayState, "width">, x: number, y: number): number { return y * state.width + x; }
function cellKey(x: number, y: number): string { return `${x}_${y}`; }
function strengthFor(energy: number): "faint" | "medium" | "strong" { return energy >= 4 ? "strong" : energy >= 2 ? "medium" : "faint"; }
function isWall(state: EchoRelayState, x: number, y: number): boolean {
  return x < 0 || y < 0 || x >= state.width || y >= state.height || state.walls[cellIndex(state, x, y)] === true;
}

export function create(seed: number): EchoRelayState {
  const mirrored = (seedBits(seed) & 1) === 1;
  const walls = TEMPLATE.flatMap((row) => [...row].map((cell) => cell === "#"));
  return {
    game: "echo-relay", seed, tick: 0, reward: 0, pendingFeedback: [], width: WIDTH, height: HEIGHT, walls,
    beacon: mirrored ? { x: 1, y: 1 } : { x: WIDTH - 2, y: 1 },
    player: mirrored ? { x: WIDTH - 2, y: 1 } : { x: 1, y: 1 }, facing: mirrored ? "west" : "east",
    playerEnergy: PLAYER_CAPACITY, pulseEnergy: PULSE_CAPACITY, pulse: null, knownWalls: [], echoes: [],
    arrived: false, collisions: 0, discoveries: 0,
  };
}

export function buildNarsStep(state: EchoRelayState): ExpansionNarsStep {
  const beliefs = state.knownWalls.map((cell) => belief(`wall_at_${cell}`));
  for (const echo of state.echoes) beliefs.push(belief(`echo_${echo.direction}_${echo.strength}_${echo.target}`));
  beliefs.push(belief(state.pulseEnergy >= 2 && state.pulse === null ? "pulse_available" : "pulse_unavailable"));
  return { beliefs, goals: [goal], feedback: state.pendingFeedback.splice(0), cycles: definition.cycles };
}

function recordEcho(state: EchoRelayState, target: "wall" | "beacon" | "range", strength: "faint" | "medium" | "strong", notes: string[], feedback: string[]): void {
  state.echoes.push({ direction: state.pulse!.direction, strength, target });
  state.echoes = state.echoes.slice(-8);
  if (target === "wall") {
    const point = state.pulse!.path.at(-1)!;
    const direction = DIRS[state.pulse!.direction];
    const wall = cellKey(point.x + direction.x, point.y + direction.y);
    if (!state.knownWalls.includes(wall)) { state.knownWalls.push(wall); state.discoveries++; }
    notes.push("WALL_ECHO"); feedback.push(belief(`wall_discovered_${wall}`));
  } else if (target === "beacon") { notes.push("BEACON_ECHO"); feedback.push(belief(`beacon_echo_${strength}`)); }
  else notes.push("ECHO_RANGE");
}

function advancePulse(state: EchoRelayState, notes: string[], feedback: string[]): void {
  const pulse = state.pulse;
  if (!pulse) return;
  if (pulse.phase === "outbound") {
    const direction = DIRS[pulse.direction];
    const current = pulse.path.at(-1)!;
    const next = { x: current.x + direction.x, y: current.y + direction.y };
    if (isWall(state, next.x, next.y)) {
      pulse.target = "wall"; pulse.phase = "return"; pulse.returnIndex = pulse.path.length - 1;
      recordEcho(state, "wall", strengthFor(pulse.energy), notes, feedback);
    } else {
      pulse.path.push(next); pulse.energy--;
      if (next.x === state.beacon.x && next.y === state.beacon.y) {
        pulse.target = "beacon"; pulse.phase = "return"; pulse.returnIndex = pulse.path.length - 1;
        recordEcho(state, "beacon", strengthFor(pulse.energy), notes, feedback);
      } else if (pulse.energy <= 0) {
        pulse.target = "range"; pulse.phase = "return"; pulse.returnIndex = pulse.path.length - 1;
        recordEcho(state, "range", strengthFor(0), notes, feedback);
      }
    }
  } else {
    pulse.returnIndex--;
    if (pulse.returnIndex < 0) {
      const recovered = pulse.target === "beacon" ? 2 : pulse.target === "wall" ? 1 : 0;
      state.pulseEnergy = Math.min(PULSE_CAPACITY, state.pulseEnergy + recovered);
      if (pulse.target === "beacon") { state.arrived = true; state.reward = 1; notes.push("SIGNAL_RETURNED"); feedback.push(belief("signal_at_beacon")); }
      else notes.push("ECHO_RETURNED");
      state.pulse = null;
    }
  }
}

export function advance(state: EchoRelayState, raw: string | null): ExpansionResult {
  const action = String(raw ?? "").replace(/^\^/, "").toLowerCase();
  const notes: string[] = []; const feedback: string[] = []; state.reward = 0;
  if (action === "turn_left" || action === "turn_right") {
    const offset = action === "turn_left" ? 3 : 1;
    state.facing = CLOCKWISE[(CLOCKWISE.indexOf(state.facing) + offset) % CLOCKWISE.length];
  } else if (action === "move" && state.playerEnergy > 0) {
    const direction = DIRS[state.facing]; const nx = state.player.x + direction.x; const ny = state.player.y + direction.y;
    state.playerEnergy--;
    if (isWall(state, nx, ny)) { state.collisions++; notes.push("COLLISION"); feedback.push(belief("movement_blocked")); }
    else {
      state.player.x = nx; state.player.y = ny; notes.push("MOVED");
      if (nx === state.beacon.x && ny === state.beacon.y) { state.arrived = true; state.reward = 1; notes.push("BEACON_REACHED"); feedback.push(belief("signal_at_beacon")); }
    }
  } else if (action === "ping" && state.pulseEnergy >= 2 && state.pulse === null) {
    state.pulseEnergy -= 2;
    state.pulse = { path: [{ ...state.player }], direction: state.facing, phase: "outbound", energy: PULSE_CAPACITY, strength: "strong", target: null, returnIndex: -1 };
    notes.push("PING_SENT");
  } else if (action === "move" && state.playerEnergy <= 0) notes.push("ENERGY_EMPTY");
  else if (action === "ping") notes.push(state.pulse ? "PULSE_BUSY" : "PULSE_ENERGY_LOW");
  if (state.pulse) advancePulse(state, notes, feedback);
  state.pendingFeedback.push(...feedback); state.tick++;
  return { notes, feedback, reward: state.reward };
}

export function applyManualControl(state: EchoRelayState, action: string): boolean {
  const normalized = action.replace(/^\^/, "").toLowerCase();
  if (!["move", "turn_left", "turn_right", "ping"].includes(normalized)) return false;
  advance(state, normalized); return true;
}
