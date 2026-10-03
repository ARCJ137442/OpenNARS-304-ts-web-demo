import { DEMO_IDS, type DemoId } from "./types.ts";

export function seededRandom(seed: number): () => number {
  let state = Number(seed) >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

export function stepRandom(seed: number, tick: number): () => number {
  return seededRandom((seed ^ Math.imul(tick + 1, 0x9e3779b1)) >>> 0);
}

export function normalizeAction(action: string | null): string {
  return String(action ?? "").replace(/^\^/, "").toLowerCase();
}

export function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

export function selfBelief(property: string): string {
  return `<{SELF} --> [${property}]>. :|:`;
}

export function selfGoal(property: string): string {
  return `<{SELF} --> [${property}]>! :|:`;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function randomInt(random: () => number, minimum: number, maximum: number): number {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

export function isDemoId(value: string | null): value is DemoId {
  return value !== null && DEMO_IDS.includes(value as DemoId);
}
