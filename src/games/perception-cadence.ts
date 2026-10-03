import type { NarsStep } from "./types.ts";

export const EXPANSION_INPUT_CADENCE = Object.freeze({ warmupTicks: 5, refreshEvery: 5 });

/** Reports changed state immediately and refreshes stable state periodically. */
export class PerceptionCadence {
  private previousBeliefs = new Set<string>();
  private previousGoals = new Set<string>();
  private readonly warmupTicks: number;
  private readonly refreshEvery: number;

  constructor(warmupTicks: number, refreshEvery: number) {
    if (!Number.isSafeInteger(warmupTicks) || warmupTicks < 0
      || !Number.isSafeInteger(refreshEvery) || refreshEvery < 1) {
      throw new RangeError("Perception cadence requires bounded positive intervals");
    }
    this.warmupTicks = warmupTicks;
    this.refreshEvery = refreshEvery;
  }

  reset(): void {
    this.previousBeliefs.clear();
    this.previousGoals.clear();
  }

  select(tick: number, input: NarsStep): NarsStep {
    const refresh = tick <= this.warmupTicks || tick % this.refreshEvery === 0;
    const beliefs = input.beliefs.filter((belief) => refresh || !this.previousBeliefs.has(belief));
    const goals = input.goals.filter((goal) => refresh || !this.previousGoals.has(goal));
    this.previousBeliefs = new Set(input.beliefs);
    this.previousGoals = new Set(input.goals);
    return { ...input, beliefs, goals };
  }
}
