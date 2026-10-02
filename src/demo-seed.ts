/** Optional URL seed for reproducible environment and reasoner traces. */
export function initialDemoSeed(search: string, randomSeed: () => number): number {
  const raw = new URLSearchParams(search).get("seed");
  if (raw !== null && /^\d+$/.test(raw)) {
    const seed = Number(raw);
    if (Number.isSafeInteger(seed) && seed > 0 && seed <= 0xffff_ffff) return seed;
  }
  return randomSeed();
}
