/** Keep environment steps on a fixed clock while allowing inference overruns. */
export function nextWorldStepDeadline(previousDeadlineMs: number, completedAtMs: number, targetTps: number): number {
  const periodMs = 1000 / Math.max(1, targetTps);
  return Math.max(previousDeadlineMs + periodMs, completedAtMs);
}
