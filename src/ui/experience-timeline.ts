import {
  EXPERIENCE_LIMIT,
  experienceKindLabel,
  experienceSourceLabel,
  type ExperienceEvent,
} from "../experience/contract.ts";

type ExperienceTimelineElements = {
  details: HTMLDetailsElement;
  list: HTMLOListElement;
  status: HTMLOutputElement;
  meta: HTMLElement;
};

export type ExperienceTimeline = {
  add(event: ExperienceEvent): void;
  reset(): void;
  dispose(): void;
};

/** Render a bounded, source-labelled timeline without inspecting reasoner bags. */
export function mountExperienceTimeline(
  elements: ExperienceTimelineElements,
  requestSnapshot: (open: boolean) => void,
): ExperienceTimeline {
  const retained = new Map<number, ExperienceEvent>();
  const summary = elements.details.querySelector("summary");
  const render = (): void => {
    elements.list.replaceChildren();
    const entries = [...retained.values()].sort((left, right) => left.id - right.id).slice(-24);
    for (const event of entries) {
      const item = document.createElement("li");
      item.className = `experience-entry experience-${event.kind}`;
      item.dataset.source = event.source;
      const marker = document.createElement("span");
      marker.className = "experience-marker";
      marker.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.className = "experience-text";
      text.textContent = event.text;
      const meta = document.createElement("span");
      meta.className = "experience-meta";
      meta.textContent = `${experienceKindLabel(event.kind)} · ${experienceSourceLabel(event.source)} · NAR ${event.narTime}`;
      item.append(marker, text, meta);
      if (event.evidence.length > 0) {
        const evidence = document.createElement("details");
        evidence.className = "experience-evidence";
        const summary = document.createElement("summary");
        summary.textContent = "原始事件";
        const raw = document.createElement("code");
        raw.textContent = event.evidence;
        evidence.append(summary, raw);
        item.append(evidence);
      }
      elements.list.append(item);
    }
    const latest = entries.at(-1);
    elements.status.value = latest === undefined ? "尚未观察到" : `${experienceKindLabel(latest.kind)} · ${experienceSourceLabel(latest.source)}`;
    elements.status.textContent = elements.status.value;
    elements.meta.textContent = `窗口 ${EXPERIENCE_LIMIT} · 显示 ${entries.length}/24 · 仅收集真实事件`;
  };
  const onSummaryClick = (event: MouseEvent): void => {
    event.preventDefault();
    elements.details.open = !elements.details.open;
    requestSnapshot(elements.details.open);
  };
  summary?.addEventListener("click", onSummaryClick);
  render();
  return {
    add(event) {
      retained.set(event.id, event);
      while (retained.size > EXPERIENCE_LIMIT) retained.delete(retained.keys().next().value as number);
      render();
    },
    reset() {
      retained.clear();
      render();
    },
    dispose() {
      summary?.removeEventListener("click", onSummaryClick);
    },
  };
}
