import type { Board, Direction } from "./games/nars2048.ts";

type Visual = {
  value: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
  alpha: number;
  targetScale: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  age: number;
  ttl: number;
  glyph: string;
};

const BOARD_SIZE = 4;
const GUTTER_RATIO = 0.0905;
const TILE_INSET_RATIO = 0.06;
const PARTICLE_TTL = 0.62;
const PARTICLE_SIZE = { min: 0.32, max: 0.56 };

const COLORS: Record<number, [string, string, boolean?]> = {
  0: ["#344239", "#748276"], 2: ["#b8c9a4", "#1b241d"], 4: ["#a9c986", "#1b241d"],
  8: ["#ffc56c", "#1b241d"], 16: ["#ff9a68", "#fff"], 32: ["#ff7661", "#fff"], 64: ["#e85c68", "#fff"],
  128: ["#73d8c7", "#10201b", true], 256: ["#5ac8bd", "#10201b", true], 512: ["#43b5ae", "#10201b", true],
  1024: ["#ffc56c", "#1b241d", true], 2048: ["#b7e66e", "#10201b", true],
};

export type BoardGeometry = {
  width: number;
  height: number;
  cell: number;
  pad: number;
  gap: number;
  tileInset: number;
  dpr: number;
};

/** Jev layout contract: derive the whole board from the smaller available dimension. */
export function calculateBoardGeometry(width: number, height: number, devicePixelRatio = 1): BoardGeometry | null {
  if (width <= 0 || height <= 0) return null;
  const units = BOARD_SIZE + (BOARD_SIZE + 1) * GUTTER_RATIO;
  const cell = Math.floor(Math.min(width, height) / units);
  if (cell < 4) return null;
  const gutter = cell * GUTTER_RATIO;
  return {
    width: Math.round(cell * units),
    height: Math.round(cell * units),
    cell,
    pad: gutter,
    gap: gutter,
    tileInset: Math.max(2, cell * TILE_INSET_RATIO),
    dpr: Math.min(Math.max(devicePixelRatio, 1), 2.5),
  };
}

/** Keep animated tiles inside their slot, including during future overshoot animations. */
export function tileSizeFor(geometry: BoardGeometry, scale = 1): number {
  return Math.min(
    geometry.cell - geometry.tileInset * 2,
    geometry.cell * Math.max(0, scale),
  );
}

/** Fractional coordinates move through the cell interior without scaling offsets by the gap. */
export function gridPoint(geometry: BoardGeometry, x: number, y: number): { x: number; y: number } {
  const step = geometry.cell + geometry.gap;
  const col = Math.floor(x);
  const row = Math.floor(y);
  return {
    x: geometry.pad + col * step + (x - col) * geometry.cell,
    y: geometry.pad + row * step + (y - row) * geometry.cell,
  };
}

export class Nars2048Renderer {
  public animations = true;
  public particlesEnabled = true;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly visuals = new Map<number, Visual>();
  private previous: Board | null = null;
  private particles: Particle[] = [];
  private geometry: BoardGeometry | null = null;
  private readonly resizeObserver: ResizeObserver;
  private raf = 0;
  private lastFrame = 0;

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2048 canvas is unavailable");
    this.context = context;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    if (canvas.parentElement) this.resizeObserver.observe(canvas.parentElement);
  }

  public resize(): void {
    const frame = this.canvas.parentElement;
    if (!frame) return;
    const geometry = calculateBoardGeometry(frame.clientWidth, frame.clientHeight, window.devicePixelRatio || 1);
    if (!geometry) return;
    if (this.geometry && geometry.width === this.geometry.width && geometry.height === this.geometry.height && geometry.dpr === this.geometry.dpr) return;

    this.geometry = geometry;
    this.canvas.width = Math.round(geometry.width * geometry.dpr);
    this.canvas.height = Math.round(geometry.height * geometry.dpr);
    this.context.setTransform(geometry.dpr, 0, 0, geometry.dpr, 0, 0);
    this.draw();
  }

  public sync(board: Board): void {
    this.resize();
    for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
      const value = board[index] ?? 0;
      const x = index % BOARD_SIZE;
      const y = Math.floor(index / BOARD_SIZE);
      const previous = this.previous?.[index] ?? 0;
      const current = this.visuals.get(index);
      if (!current) {
        this.visuals.set(index, {
          value, x, y, targetX: x, targetY: y,
          scale: this.animations && value > 0 ? 0.42 : 1,
          alpha: this.animations && value > 0 ? 0 : 1,
          targetScale: 1,
        });
      } else {
        current.value = value;
        current.targetX = x;
        current.targetY = y;
        if (value > 0 && value !== previous) {
          current.scale = this.animations ? 0.84 : 1;
          current.alpha = this.animations ? 0.7 : 1;
          current.targetScale = 1;
        }
      }
    }
    this.previous = [...board];
    if (this.animations) this.start();
    else this.draw();
  }

  public trigger(direction: Direction, merged: boolean, gained: number, board: Board = this.previous ?? []): void {
    this.resize();
    if (this.animations && this.particlesEnabled && this.geometry) {
      const origins = this.changedCells(board);
      const particleOrigins = origins.length > 0 ? origins : this.edgeCells(direction, board);
      const vertical = direction === "up" || direction === "down";
      const speed = direction === "down" || direction === "right" ? 1.6 : -1.6;
      const glyph = direction === "up" ? "↑" : direction === "down" ? "↓" : direction === "left" ? "←" : "→";

      for (const origin of particleOrigins) {
        const count = merged ? 4 : 2;
        for (let index = 0; index < count; index += 1) {
          this.particles.push({
            x: origin.x + 0.5 + (Math.random() - 0.5) * 0.6,
            y: origin.y + 0.5 + (Math.random() - 0.5) * 0.6,
            vx: vertical ? 0 : speed * (0.7 + Math.random() * 0.6),
            vy: vertical ? speed * (0.7 + Math.random() * 0.6) : 0,
            size: PARTICLE_SIZE.min + Math.random() * (PARTICLE_SIZE.max - PARTICLE_SIZE.min),
            age: 0,
            ttl: PARTICLE_TTL * (0.7 + Math.random() * 0.65),
            glyph,
          });
        }
      }
    }
    if (gained > 0) this.canvas.dataset.scoreFlash = `+${gained}`;
    this.start();
  }

  public invalid(direction: Direction, board: Board = this.previous ?? []): void {
    this.trigger(direction, false, 0, board);
  }

  public setMotion(enabled: boolean): void {
    this.animations = enabled;
    if (enabled) return;
    for (const visual of this.visuals.values()) {
      visual.x = visual.targetX;
      visual.y = visual.targetY;
      visual.scale = 1;
      visual.alpha = 1;
      visual.targetScale = 1;
    }
    this.particles = [];
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.draw();
  }

  public clear(): void {
    this.visuals.clear();
    this.previous = null;
    this.particles = [];
    this.draw();
  }

  public dispose(): void {
    this.resizeObserver.disconnect();
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private changedCells(board: Board): Array<{ x: number; y: number }> {
    if (!this.previous) return [];
    const cells: Array<{ x: number; y: number }> = [];
    for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
      if ((this.previous[index] ?? 0) !== (board[index] ?? 0)) {
        cells.push({ x: index % BOARD_SIZE, y: Math.floor(index / BOARD_SIZE) });
      }
    }
    return cells;
  }

  private edgeCells(direction: Direction, board: Board): Array<{ x: number; y: number }> {
    const cells: Array<{ x: number; y: number }> = [];
    for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
      const x = index % BOARD_SIZE;
      const y = Math.floor(index / BOARD_SIZE);
      const atEdge = direction === "up" ? y === 0 : direction === "down" ? y === BOARD_SIZE - 1 : direction === "left" ? x === 0 : x === BOARD_SIZE - 1;
      if (atEdge && (board[index] ?? 0) > 0) cells.push({ x, y });
    }
    return cells.length > 0 ? cells : [{ x: 1, y: 1 }];
  }

  private start(): void {
    if (!this.raf) {
      this.lastFrame = 0;
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  private tick = (timestamp: number): void => {
    const delta = this.lastFrame === 0 ? 16.7 : Math.min(timestamp - this.lastFrame, 50);
    this.lastFrame = timestamp;
    const easing = 1 - Math.pow(0.72, delta / 16.7);
    let active = false;
    for (const visual of this.visuals.values()) {
      visual.x += (visual.targetX - visual.x) * easing;
      visual.y += (visual.targetY - visual.y) * easing;
      visual.scale += (visual.targetScale - visual.scale) * easing;
      visual.alpha += (1 - visual.alpha) * easing;
      active ||= Math.abs(visual.targetX - visual.x) > 0.01 || Math.abs(visual.targetY - visual.y) > 0.01 || Math.abs(visual.targetScale - visual.scale) > 0.01;
    }
    for (const particle of this.particles) {
      particle.age += delta / 1000;
      particle.x += particle.vx * delta / 1000;
      particle.y += particle.vy * delta / 1000;
    }
    this.particles = this.particles.filter((particle) => particle.age < particle.ttl);
    active ||= this.particles.length > 0;
    this.draw();
    if (active) this.raf = requestAnimationFrame(this.tick);
    else this.raf = 0;
  };

  private draw(): void {
    const geometry = this.geometry;
    if (!geometry) return;
    const context = this.context;
    context.clearRect(0, 0, geometry.width, geometry.height);
    context.fillStyle = "#141210";
    context.fillRect(0, 0, geometry.width, geometry.height);
    const radius = geometry.cell * 0.15;

    for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
      const point = gridPoint(geometry, index % BOARD_SIZE, Math.floor(index / BOARD_SIZE));
      context.fillStyle = "#0d0c0a";
      this.roundRect(point.x, point.y, geometry.cell, geometry.cell, radius);
      context.fill();
      if (geometry.cell > 26) {
        context.strokeStyle = "rgba(255,255,255,.05)";
        context.lineWidth = 1;
        this.roundRect(point.x + 0.5, point.y + 0.5, geometry.cell - 1, geometry.cell - 1, radius);
        context.stroke();
      }
    }

    for (const visual of this.visuals.values()) {
      if (visual.value <= 0 || visual.alpha < 0.02) continue;
      const color = COLORS[visual.value] ?? ["#fff0c2", "#2a1c00", true];
      const point = gridPoint(geometry, visual.x, visual.y);
      const centerX = point.x + geometry.cell / 2;
      const centerY = point.y + geometry.cell / 2;
      const size = tileSizeFor(geometry, visual.scale);
      context.save();
      context.globalAlpha = Math.min(1, visual.alpha);
      if (color[2]) {
        context.shadowColor = color[0];
        context.shadowBlur = geometry.cell * 0.4;
      }
      context.fillStyle = color[0];
      this.roundRect(centerX - size / 2, centerY - size / 2, size, size, radius * visual.scale);
      context.fill();
      context.restore();

      const digits = String(visual.value).length;
      const fontRatio = digits <= 2 ? 0.42 : digits === 3 ? 0.32 : 0.24;
      const fontSize = Math.max(8, size * fontRatio);
      context.save();
      context.globalAlpha = Math.min(1, visual.alpha);
      context.fillStyle = color[1];
      context.font = `600 ${fontSize.toFixed(1)}px ui-monospace, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(visual.value), centerX, centerY + fontSize * 0.03);
      context.restore();
    }

    if (this.particles.length > 0) {
      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.shadowColor = "#ffcf6b";
      for (const particle of this.particles) {
        const progress = particle.age / particle.ttl;
        const alpha = Math.pow(1 - progress, 1.6);
        const shrink = Math.pow(1 - progress, 0.75);
        const fontSize = Math.max(5, geometry.cell * particle.size * shrink);
        const point = gridPoint(geometry, particle.x, particle.y);
        context.globalAlpha = alpha * 0.95;
        context.shadowBlur = fontSize * 0.8;
        context.fillStyle = "#ffcf6b";
        context.font = `700 ${fontSize.toFixed(1)}px ui-monospace, monospace`;
        context.fillText(particle.glyph, point.x, point.y);
      }
      context.restore();
    }
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    const context = this.context;
    const corner = Math.max(0, Math.min(radius, width / 2, height / 2));
    context.beginPath();
    context.moveTo(x + corner, y);
    context.arcTo(x + width, y, x + width, y + height, corner);
    context.arcTo(x + width, y + height, x, y + height, corner);
    context.arcTo(x, y + height, x, y, corner);
    context.arcTo(x, y, x + width, y, corner);
    context.closePath();
  }
}
