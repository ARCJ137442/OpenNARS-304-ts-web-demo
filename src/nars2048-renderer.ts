import type { Board, Direction } from "./games/nars2048.ts";

type Visual = { value: number; x: number; y: number; targetX: number; targetY: number; scale: number; alpha: number; targetScale: number };
type Particle = { x: number; y: number; vx: number; vy: number; age: number; ttl: number; glyph: string };

const COLORS: Record<number, [string, string, boolean?]> = {
  0: ["#344239", "#748276"], 2: ["#b8c9a4", "#1b241d"], 4: ["#a9c986", "#1b241d"],
  8: ["#ffc56c", "#1b241d"], 16: ["#ff9a68", "#fff"], 32: ["#ff7661", "#fff"], 64: ["#e85c68", "#fff"],
  128: ["#73d8c7", "#10201b", true], 256: ["#5ac8bd", "#10201b", true], 512: ["#43b5ae", "#10201b", true],
  1024: ["#ffc56c", "#1b241d", true], 2048: ["#b7e66e", "#10201b", true],
};

export class Nars2048Renderer {
  public animations = true;
  public particlesEnabled = true;
  private readonly context: CanvasRenderingContext2D;
  private visuals = new Map<number, Visual>();
  private previous: Board | null = null;
  private particles: Particle[] = [];
  private raf = 0;
  private lastFrame = 0;
  private width = 0;
  private height = 0;
  private cell = 0;
  private pad = 0;
  private gap = 0;

  public constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2048 canvas is unavailable");
    this.context = context;
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
    const size = Math.max(1, Math.floor(Math.min(rect.width, rect.height)));
    if (size === this.width && this.canvas.width === Math.round(size * ratio)) return;
    this.width = size;
    this.height = size;
    this.canvas.width = Math.round(size * ratio);
    this.canvas.height = Math.round(size * ratio);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.cell = Math.floor(size / 4.9);
    this.gap = this.cell * .09;
    this.pad = this.gap;
    this.draw();
  }

  public sync(board: Board): void {
    this.resize();
    for (let index = 0; index < 16; index += 1) {
      const value = board[index] ?? 0;
      const x = index % 4;
      const y = Math.floor(index / 4);
      const previous = this.previous?.[index] ?? 0;
      const current = this.visuals.get(index);
      if (!current) {
        this.visuals.set(index, { value, x, y, targetX: x, targetY: y, scale: this.animations && value > 0 ? .42 : 1, alpha: this.animations && value > 0 ? 0 : 1, targetScale: 1 });
      } else {
        current.value = value;
        current.targetX = x;
        current.targetY = y;
        if (value > 0 && value !== previous) { current.scale = this.animations ? .84 : 1; current.alpha = this.animations ? .7 : 1; current.targetScale = this.animations ? 1.12 : 1; }
      }
    }
    this.previous = [...board];
    if (this.animations) this.start(); else this.draw();
  }

  public trigger(direction: Direction, merged: boolean, gained: number): void {
    this.resize();
    const glyph = direction === "up" ? "↑" : direction === "down" ? "↓" : direction === "left" ? "←" : "→";
    if (this.animations && this.particlesEnabled) for (let i = 0; i < (merged ? 8 : 4); i += 1) this.particles.push({ x: 2 + (Math.random() - .5) * 2.8, y: 2 + (Math.random() - .5) * 2.8, vx: direction === "left" ? -1.5 : direction === "right" ? 1.5 : 0, vy: direction === "up" ? -1.5 : direction === "down" ? 1.5 : 0, age: 0, ttl: .45 + Math.random() * .22, glyph });
    if (gained > 0) this.canvas.dataset.scoreFlash = `+${gained}`;
    this.start();
  }

  public invalid(direction: Direction): void { this.trigger(direction, false, 0); }

  public setMotion(enabled: boolean): void { this.animations = enabled; if (!enabled) { for (const visual of this.visuals.values()) { visual.x = visual.targetX; visual.y = visual.targetY; visual.scale = 1; visual.alpha = 1; visual.targetScale = 1; } this.particles = []; if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; } this.draw(); } }

  public clear(): void { this.visuals.clear(); this.previous = null; this.particles = []; this.draw(); }

  private start(): void { if (!this.raf) { this.lastFrame = 0; this.raf = requestAnimationFrame(this.tick); } }

  private tick = (timestamp: number): void => {
    const delta = this.lastFrame === 0 ? 16.7 : Math.min(timestamp - this.lastFrame, 50);
    this.lastFrame = timestamp;
    const easing = 1 - Math.pow(.72, delta / 16.7);
    let active = false;
    for (const visual of this.visuals.values()) {
      visual.x += (visual.targetX - visual.x) * easing;
      visual.y += (visual.targetY - visual.y) * easing;
      visual.scale += (visual.targetScale - visual.scale) * easing;
      visual.alpha += (1 - visual.alpha) * easing;
      active ||= Math.abs(visual.targetX - visual.x) > .01 || Math.abs(visual.targetY - visual.y) > .01 || Math.abs(visual.targetScale - visual.scale) > .01;
    }
    for (const particle of this.particles) { particle.age += delta / 1000; particle.x += particle.vx * delta / 1000; particle.y += particle.vy * delta / 1000; }
    this.particles = this.particles.filter((particle) => particle.age < particle.ttl);
    active ||= this.particles.length > 0;
    this.draw();
    if (active) this.raf = requestAnimationFrame(this.tick); else this.raf = 0;
  };

  private draw(): void {
    if (this.width <= 0) return;
    const context = this.context;
    context.clearRect(0, 0, this.width, this.height);
    context.fillStyle = "#141a16"; context.fillRect(0, 0, this.width, this.height);
    const radius = this.cell * .15;
    const point = (x: number, y: number) => ({ x: this.pad + x * (this.cell + this.gap), y: this.pad + y * (this.cell + this.gap) });
    for (let index = 0; index < 16; index += 1) { const p = point(index % 4, Math.floor(index / 4)); context.fillStyle = "#0d100e"; this.roundRect(p.x, p.y, this.cell, this.cell, radius); context.fill(); }
    for (const visual of this.visuals.values()) {
      if (visual.value <= 0 || visual.alpha < .02) continue;
      const p = point(visual.x, visual.y); const color = COLORS[visual.value] ?? ["#fff0c2", "#2a1c00", true]; const size = this.cell * visual.scale; context.save(); context.globalAlpha = Math.min(1, visual.alpha); if (color[2]) { context.shadowColor = color[0]; context.shadowBlur = this.cell * .34; } context.fillStyle = color[0]; this.roundRect(p.x + (this.cell - size) / 2, p.y + (this.cell - size) / 2, size, size, radius * visual.scale); context.fill(); context.restore(); context.fillStyle = color[1]; context.font = `600 ${Math.max(8, this.cell * (String(visual.value).length > 3 ? .22 : .34))}px ui-monospace, monospace`; context.textAlign = "center"; context.textBaseline = "middle"; context.globalAlpha = Math.min(1, visual.alpha); context.fillText(String(visual.value), p.x + this.cell / 2, p.y + this.cell / 2); context.globalAlpha = 1;
    }
    context.save(); context.textAlign = "center"; context.textBaseline = "middle"; context.fillStyle = "#ffc56c"; context.shadowColor = "#ffc56c"; for (const particle of this.particles) { const fade = 1 - particle.age / particle.ttl; context.globalAlpha = fade; context.shadowBlur = 12 * fade; const p = point(particle.x, particle.y); context.font = `700 ${Math.max(8, this.cell * .34 * fade)}px ui-monospace, monospace`; context.fillText(particle.glyph, p.x + this.cell / 2, p.y + this.cell / 2); } context.restore();
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number): void { const context = this.context; context.beginPath(); context.moveTo(x + radius, y); context.arcTo(x + width, y, x + width, y + height, radius); context.arcTo(x + width, y + height, x, y + height, radius); context.arcTo(x, y + height, x, y, radius); context.arcTo(x, y, x + width, y, radius); context.closePath(); }
}
