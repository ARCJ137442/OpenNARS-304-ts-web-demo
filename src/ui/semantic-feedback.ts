export type FeedbackKind = "reasoned" | "exploratory" | "reward" | "cost" | "error";

const colors: Record<FeedbackKind, string> = {
  reasoned: "#73d8c7",
  exploratory: "#f7bd64",
  reward: "#b7e66e",
  cost: "#ff7661",
  error: "#ff7661",
};
const timers = new WeakMap<HTMLElement, number>();

/** A brief, data-driven cue. Color remains available when motion is reduced. */
export function signalFeedback(host: HTMLElement | null, kind: FeedbackKind): void {
  if (!host) return;
  const previousTimer = timers.get(host);
  if (previousTimer !== undefined) window.clearTimeout(previousTimer);
  host.dataset.feedback = kind;
  timers.set(host, window.setTimeout(() => {
    delete host.dataset.feedback;
    timers.delete(host);
  }, 650));
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  host.animate([
    { boxShadow: `inset 0 0 0 0 ${colors[kind]}` },
    { boxShadow: `inset 0 0 0 3px ${colors[kind]}` },
    { boxShadow: `inset 0 0 0 0 ${colors[kind]}` },
  ], { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" });
}
