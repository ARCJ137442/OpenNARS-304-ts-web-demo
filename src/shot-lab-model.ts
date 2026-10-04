export type ShotModeId = "shot-test" | "shot-test2" | "shot-2p" | "shot-2p-2ai" | "shot-evolve" | "shot-evolve2";
export type ShotDirection = "north" | "east" | "south" | "west";
export type ShotAction = "up" | "down" | "left" | "right" | "forward" | "turn_left" | "turn_right" | "shoot" | "idle";
export type ShotAiKind = "null" | "nar" | "nar2";
export type ShotPlayer = {
  id: string;
  name: string;
  ai: ShotAiKind;
  x: number;
  y: number;
  direction: ShotDirection;
  shootingTicks: number;
  hits: number;
  misses: number;
  lastHitTick: number;
  averageHitDelta: number;
  alive: boolean;
};
export type ShotRay = { owner: string; x: number; y: number; direction: ShotDirection; ttl: number; hit: boolean };
export type ShotRanking = {
  playerId: string;
  playerName: string;
  score: number;
  hitRatio: number;
  sinceLastHit: number;
  hits: number;
  misses: number;
};
export type ShotMode = {
  id: ShotModeId;
  title: string;
  subtitle: string;
  movement: "absolute" | "relative";
  players: number;
  ai: readonly ShotAiKind[];
  evolution: boolean;
  maxPlayers: number;
  cycles: number;
};
export type ShotWorld = {
  width: 50;
  height: 20;
  mode: ShotMode;
  seed: number;
  tick: number;
  players: ShotPlayer[];
  rays: ShotRay[];
  notes: string[];
  evolutionEvents: number;
  nextPlayerSerial: number;
};

export const SHOT_MODES: readonly ShotMode[] = [
  { id: "shot-test", title: "静态靶 / 绝对移动", subtitle: "单 NARS · 上下左右 · 静态目标", movement: "absolute", players: 2, ai: ["null", "nar"], evolution: false, maxPlayers: 2, cycles: 10 },
  { id: "shot-test2", title: "静态靶 / 相对移动", subtitle: "单 NARS · 转向前进 · 静态目标", movement: "relative", players: 2, ai: ["null", "nar2"], evolution: false, maxPlayers: 2, cycles: 10 },
  { id: "shot-2p", title: "双玩家 / 同构 NARS", subtitle: "两个 NARS · 绝对移动 · 互相射击", movement: "absolute", players: 2, ai: ["nar", "nar"], evolution: false, maxPlayers: 2, cycles: 10 },
  { id: "shot-2p-2ai", title: "双玩家 / 两种接口", subtitle: "AiNar 与 AiNar2 · 相对控制", movement: "relative", players: 2, ai: ["nar", "nar2"], evolution: false, maxPlayers: 2, cycles: 10 },
  { id: "shot-evolve", title: "进化竞技场", subtitle: "静态靶 + 双 NARS · 命中率排名 · 克隆优秀玩家", movement: "absolute", players: 3, ai: ["null", "nar", "nar"], evolution: true, maxPlayers: 5, cycles: 10 },
  { id: "shot-evolve2", title: "进化竞技场 / 混合接口", subtitle: "静态靶 + 四 NARS · 两种接口 · 排名与重生", movement: "relative", players: 5, ai: ["null", "nar", "nar2", "nar", "nar2"], evolution: true, maxPlayers: 7, cycles: 10 },
];

const directions: ShotDirection[] = ["north", "east", "south", "west"];
const delta: Record<ShotDirection, [number, number]> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
const turn = (direction: ShotDirection, amount: number): ShotDirection => directions[(directions.indexOf(direction) + amount + directions.length) % directions.length];
const actionName = (action: string | null): ShotAction => {
  const normalized = String(action ?? "").replace(/^\^/, "").toLowerCase();
  if (normalized === "forward") return "forward";
  if (normalized === "turn_left") return "turn_left";
  if (normalized === "turn_right") return "turn_right";
  if (normalized === "shoot" || normalized === "shot") return "shoot";
  if (normalized === "up" || normalized === "down" || normalized === "left" || normalized === "right") return normalized;
  return "idle";
};
const nextRandom = (world: ShotWorld): number => {
  world.seed ^= world.seed << 13;
  world.seed ^= world.seed >>> 17;
  world.seed ^= world.seed << 5;
  return (world.seed >>> 0) / 0x1_0000_0000;
};
const occupied = (world: ShotWorld, x: number, y: number, except?: string): boolean => world.players.some((player) => player.alive && player.id !== except && player.x === x && player.y === y);
const freePosition = (world: ShotWorld, except?: string): [number, number] => {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const x = 1 + Math.floor(nextRandom(world) * (world.width - 2));
    const y = 1 + Math.floor(nextRandom(world) * (world.height - 2));
    if (!occupied(world, x, y, except)) return [x, y];
  }
  return [1, 1];
};

export function modeById(id: ShotModeId): ShotMode { return SHOT_MODES.find((mode) => mode.id === id) ?? SHOT_MODES[0]; }

export function createShotWorld(modeId: ShotModeId = "shot-test", seed = 3040304): ShotWorld {
  const mode = modeById(modeId);
  const world: ShotWorld = { width: 50, height: 20, mode, seed: seed >>> 0 || 1, tick: 0, players: [], rays: [], notes: [], evolutionEvents: 0, nextPlayerSerial: 1 };
  for (let index = 0; index < mode.players; index += 1) {
    const [x, y] = freePosition(world);
    world.players.push({ id: `p${index + 1}`, name: `P${index + 1}`, ai: mode.ai[index] ?? "nar", x, y, direction: index % 2 === 0 ? "east" : "west", shootingTicks: 0, hits: 0, misses: 0, lastHitTick: 0, averageHitDelta: 0, alive: true });
  }
  // Stable opening geometry makes the first perception reproducible: P1 starts
  // facing a target so every mode has a meaningful NARS decision opportunity.
  const first = world.players.find((player) => player.ai !== "null");
  if (first) { first.x = 10; first.y = 10; first.direction = "east"; }
  const target = world.players.find((player) => player.ai === "null");
  if (target) { target.x = 15; target.y = 10; }
  world.players.filter((player) => player.ai !== "null" && player !== first).forEach((player, index) => { player.x = 30 + index * 5; player.y = 10; player.direction = "west"; });
  return world;
}

export function playerFor(world: ShotWorld, id: string): ShotPlayer | undefined { return world.players.find((player) => player.id === id); }

/** Match NARust-o's integer fitness contract: hit ratio / (time since hit + 1), rounded to 4 decimals. */
export function rankShotPlayers(world: ShotWorld): ShotRanking[] {
  return world.players
    .filter((player) => player.ai !== "null" && player.hits + player.misses > 0)
    .map((player) => {
      const shots = player.hits + player.misses;
      const hitRatio = player.hits / shots;
      const sinceLastHit = world.tick - player.lastHitTick;
      return {
        playerId: player.id,
        playerName: player.name,
        score: Math.round((hitRatio / (sinceLastHit + 1)) * 10_000),
        hitRatio,
        sinceLastHit,
        hits: player.hits,
        misses: player.misses,
      };
    })
    .sort((left, right) => left.score - right.score);
}

function targetInDirection(world: ShotWorld, owner: ShotPlayer): ShotPlayer | undefined {
  const [vx, vy] = delta[owner.direction];
  const targets = world.players.filter((player) => player.alive && player.id !== owner.id && (vx === 0 ? player.x === owner.x : player.y === owner.y) && ((player.x - owner.x) * vx + (player.y - owner.y) * vy) > 0);
  // NARust-o scans player IDs and takes the first matching target. Preserve
  // that observable tie/order contract instead of choosing the nearest target.
  return targets[0];
}

export function senseFor(world: ShotWorld, playerId: string): string[] {
  const player = playerFor(world, playerId);
  if (!player) return [];
  const target = targetInDirection(world, player);
  if (target) return ["target_ahead", `target_distance_${Math.abs(target.x - player.x) + Math.abs(target.y - player.y)}`];
  const nearest = world.players.filter((item) => item.alive && item.id !== playerId).sort((a, b) => Math.abs(a.x - player.x) + Math.abs(a.y - player.y) - (Math.abs(b.x - player.x) + Math.abs(b.y - player.y)))[0];
  if (!nearest) return ["alone"];
  return [nearest.x < player.x ? "target_left" : nearest.x > player.x ? "target_right" : nearest.y < player.y ? "target_up" : "target_down"];
}

export function buildShotNarsStep(world: ShotWorld, playerId: string): { beliefs: string[]; goals: string[]; feedback: string[]; cycles: number } {
  const player = playerFor(world, playerId);
  const beliefs = senseFor(world, playerId).map((sense) => `<{SELF} --> [${sense}]>. :|:`);
  const feedback = world.notes.splice(0).filter((note) => note.startsWith(`${playerId}:`)).map((note) => `<{SELF} --> [${note.includes("HIT") ? "hit" : "miss"}]>. :|:`);
  return { beliefs, goals: ["<{SELF} --> [hit]>! :|:"], feedback, cycles: 10 };
}

export function applyShotAction(world: ShotWorld, playerId: string, rawAction: string | null): string[] {
  const player = playerFor(world, playerId);
  if (!player || !player.alive) return [];
  const action = actionName(rawAction);
  if (world.mode.movement === "absolute") {
    const absolute: Partial<Record<ShotAction, ShotDirection>> = { up: "north", right: "east", down: "south", left: "west" };
    if (absolute[action]) player.direction = absolute[action]!;
    if (absolute[action]) {
      const [vx, vy] = delta[player.direction];
      const x = Math.max(0, Math.min(world.width - 1, player.x + vx));
      const y = Math.max(0, Math.min(world.height - 1, player.y + vy));
      if (!occupied(world, x, y, player.id)) { player.x = x; player.y = y; }
    }
  } else {
    if (action === "turn_left") player.direction = turn(player.direction, -1);
    if (action === "turn_right") player.direction = turn(player.direction, 1);
    if (action === "forward") { const [vx, vy] = delta[player.direction]; const x = Math.max(0, Math.min(world.width - 1, player.x + vx)); const y = Math.max(0, Math.min(world.height - 1, player.y + vy)); if (!occupied(world, x, y, player.id)) { player.x = x; player.y = y; } }
  }
  if (action === "shoot") { player.shootingTicks = 3; const target = targetInDirection(world, player); if (!target) { player.misses += 1; world.notes.push(`${player.id}:MISS`); return ["MISS"]; } target.alive = false; player.hits += 1; const dt = world.tick - player.lastHitTick; player.averageHitDelta += (dt - player.averageHitDelta) / player.hits; player.lastHitTick = world.tick; world.rays.push({ owner: player.id, x: player.x, y: player.y, direction: player.direction, ttl: 3, hit: true }); world.notes.push(`${player.id}:HIT:${target.id}`); respawnPlayer(world, target); return ["HIT"]; }
  return [];
}

function respawnPlayer(world: ShotWorld, player: ShotPlayer): void {
  player.x = Math.floor(nextRandom(world) * world.width);
  player.y = Math.floor(nextRandom(world) * world.height);
  player.direction = directions[Math.floor(nextRandom(world) * directions.length)];
  player.shootingTicks = 0;
  player.alive = true;
}

export function stepShotWorld(world: ShotWorld): { notes: string[]; evolved: boolean; rankings: ShotRanking[] } {
  world.tick += 1;
  for (const player of world.players) if (player.shootingTicks > 0) player.shootingTicks -= 1;
  for (const ray of world.rays) ray.ttl -= 1;
  world.rays = world.rays.filter((ray) => ray.ttl > 0);
  let evolved = false;
  let rankings: ShotRanking[] = [];
  if (world.mode.evolution && world.tick % 500 === 0) {
    rankings = rankShotPlayers(world);
    if (rankings.length > 0) {
      const best = playerFor(world, rankings.at(-1)!.playerId)!;
      const cloneCount = world.players.length === world.mode.maxPlayers ? 1 : world.players.length < world.mode.maxPlayers ? 2 : 0;
      world.notes.push(`EVOLVE:RANK:${rankings.map((entry) => `${entry.playerId}=${entry.score}`).join(",")}`);
      for (let index = 0; index < cloneCount; index += 1) {
        const serial = world.nextPlayerSerial++;
        world.players.push({ ...best, id: `clone-${serial}`, name: `${best.name}-${serial}` });
      }
      world.evolutionEvents += 1;
      world.notes.push(`EVOLVE:CLONE:${best.id}:${cloneCount}`);
      if (rankings.length > world.mode.maxPlayers / 2) {
        const worst = rankings[0];
        world.players = world.players.filter((player) => player.id !== worst.playerId);
        world.notes.push(`EVOLVE:EVICT:${worst.playerId}`);
      }
      for (const player of world.players) respawnPlayer(world, player);
      evolved = true;
    }
  }
  return { notes: world.notes.splice(0), evolved, rankings };
}
