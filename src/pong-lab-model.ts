export type PongModeId = "classic" | "center-stop" | "difference" | "two-controller" | "adversarial" | "two-player" | "two-player-single" | "two-player-no-diff" | "two-player-diff";
export type PongRole = "paddle" | "left" | "right" | "top" | "bottom" | "ball";
export type PongDirection = "left" | "right" | "stop";

export type PongMode = {
  id: PongModeId;
  title: string;
  description: string;
  roles: PongRole[];
  sensor: "lr" | "lcr" | "diff";
  target: "top" | "both" | "ball";
  actions: readonly string[];
  cycles: number;
};

export const PONG_MODES: readonly PongMode[] = [
  { id: "classic", title: "经典单挡板", description: "左右感知 · 单 NARS 控制上挡板", roles: ["paddle"], sensor: "lr", target: "top", actions: ["^Left", "^Right"], cycles: 10 },
  { id: "center-stop", title: "左中右 + 停止", description: "三段感知 · 显式停止操作（内部操作符 Idle）", roles: ["paddle"], sensor: "lcr", target: "top", actions: ["^Left", "^Right", "^Idle"], cycles: 10 },
  { id: "difference", title: "差分感知", description: "只在球位或挡板停滞变化时输入", roles: ["paddle"], sensor: "diff", target: "top", actions: ["^Left", "^Right", "^Idle"], cycles: 10 },
  { id: "two-controller", title: "双控制器挡板", description: "左右两个独立 NARS 共同控制一块挡板", roles: ["left", "right"], sensor: "lr", target: "top", actions: ["^Left", "^Right", "^Idle"], cycles: 10 },
  { id: "adversarial", title: "球拍对抗", description: "一个 NARS 控制挡板，另一个 NARS 控制球向", roles: ["paddle", "ball"], sensor: "lcr", target: "ball", actions: ["^Left", "^Right", "^Idle"], cycles: 10 },
  { id: "two-player", title: "双挡板对战", description: "上下两块挡板，各由一个 NARS 控制", roles: ["top", "bottom"], sensor: "lr", target: "both", actions: ["^Left", "^Right"], cycles: 10 },
  { id: "two-player-single", title: "双挡板单 NARS", description: "一个 NARS 观察双挡板世界，控制上挡板", roles: ["top"], sensor: "lr", target: "both", actions: ["^Left", "^Right"], cycles: 10 },
  { id: "two-player-no-diff", title: "双挡板原始感知", description: "双挡板、无差分筛选", roles: ["top", "bottom"], sensor: "lr", target: "both", actions: ["^Left", "^Right"], cycles: 10 },
  { id: "two-player-diff", title: "双挡板差分对照", description: "上挡板原始感知、下挡板差分感知", roles: ["top", "bottom"], sensor: "diff", target: "both", actions: ["^Left", "^Right", "^Idle"], cycles: 10 },
];

export type PongWorld = { width: number; height: number; ball: { x: number; y: number; vx: number; vy: number }; paddles: { top: number; bottom: number }; tick: number; hits: { top: number; bottom: number }; misses: { top: number; bottom: number }; lastSense: Partial<Record<PongRole, string>>; trail: Array<{ x: number; y: number }>; flash: "hit" | "miss" | null };

export function modeById(id: PongModeId): PongMode { return PONG_MODES.find((mode) => mode.id === id) ?? PONG_MODES[0]; }

export function createPongWorld(): PongWorld { return { width: 50, height: 20, ball: { x: 25, y: 5, vx: 1, vy: 1 }, paddles: { top: 25, bottom: 25 }, tick: 0, hits: { top: 0, bottom: 0 }, misses: { top: 0, bottom: 0 }, lastSense: {}, trail: [], flash: null }; }

export function senseFor(world: PongWorld, mode: PongMode, role: PongRole): string[] {
  const paddle = role === "bottom" ? world.paddles.bottom : world.paddles.top;
  const delta = world.ball.x - paddle;
  const values = mode.sensor === "lcr" || mode.sensor === "diff"
    ? (delta < (mode.sensor === "lcr" ? -3 : 0) ? ["ball_left"] : delta > (mode.sensor === "lcr" ? 3 : 0) ? ["ball_right"] : ["ball_center"])
    : delta < 0 ? ["ball_left"] : delta > 0 ? ["ball_right"] : [];
  if (mode.sensor === "diff") { const key = values[0] ?? "ball_center"; if (world.lastSense[role] === key && world.tick % 5 !== 0) return []; world.lastSense[role] = key; }
  return values;
}

export function applyPongActions(world: PongWorld, actions: ReadonlyMap<PongRole, PongDirection>, mode: PongMode): { notes: string[]; reward: number } {
  world.flash = null;
  const adjust = (role: PongRole, paddle: "top" | "bottom"): void => { const action = actions.get(role); if (action === "left") world.paddles[paddle] -= 2; if (action === "right") world.paddles[paddle] += 2; world.paddles[paddle] = Math.max(4, Math.min(world.width - 5, world.paddles[paddle])); };
  if (mode.id === "two-controller") { const left = actions.get("left") === "left", right = actions.get("right") === "right"; if (left && !right) world.paddles.top -= 2; if (right && !left) world.paddles.top += 2; world.paddles.top = Math.max(4, Math.min(world.width - 5, world.paddles.top)); }
  else { if (mode.roles.includes("paddle") || mode.roles.includes("top")) adjust(mode.roles.includes("top") ? "top" : "paddle", "top"); if (mode.roles.includes("bottom")) adjust("bottom", "bottom"); }
  if (mode.roles.includes("ball")) { if (actions.get("ball") === "left") world.ball.vx = -1; if (actions.get("ball") === "right") world.ball.vx = 1; }
  world.ball.x += world.ball.vx; world.ball.y += world.ball.vy;
  if (world.ball.x <= 1 || world.ball.x >= world.width - 2) { world.ball.vx *= -1; world.ball.x = Math.max(1, Math.min(world.width - 2, world.ball.x)); }
  const notes: string[] = [];
  const check = (side: "top" | "bottom", y: number, direction: number): void => { if (world.ball.y !== y) return; const paddle = world.paddles[side]; if (Math.abs(world.ball.x - paddle) <= 4) { world.hits[side] += 1; world.ball.vy = direction; world.flash = "hit"; notes.push(`${side.toUpperCase()}_HIT`); } else { world.misses[side] += 1; world.ball.vy = direction; world.flash = "miss"; notes.push(`${side.toUpperCase()}_MISS`); } };
  if (world.ball.y <= 1) { check("top", 1, 1); world.ball.y = 1; } if (world.ball.y >= world.height - 2) { check("bottom", world.height - 2, -1); world.ball.y = world.height - 2; }
  world.trail.push({ x: world.ball.x, y: world.ball.y }); if (world.trail.length > 12) world.trail.shift(); world.tick += 1; return { notes, reward: world.flash === "hit" ? 1 : world.flash === "miss" ? -1 : 0 };
}
