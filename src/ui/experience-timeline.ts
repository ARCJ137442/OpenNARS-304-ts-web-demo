import {
  EXPERIENCE_LIMIT,
  experienceKindLabel,
  experienceSourceLabel,
  type ExperienceEvent,
  type BeliefSnapshot,
} from "../experience/contract.ts";

type ExperienceTimelineElements = {
  details: HTMLDetailsElement;
  list: HTMLOListElement;
  status: HTMLOutputElement;
  meta: HTMLElement;
};

export type ExperienceTimeline = {
  add(event: ExperienceEvent): void;
  setBeliefs(beliefs: readonly BeliefSnapshot[]): void;
  reset(): void;
  dispose(): void;
};

/** Render top retained beliefs, with the bounded event stream kept as evidence. */
export function mountExperienceTimeline(
  elements: ExperienceTimelineElements,
  requestSnapshot: (open: boolean) => void,
): ExperienceTimeline {
  const retained = new Map<number, ExperienceEvent>();
  let beliefs: readonly BeliefSnapshot[] = [];
  const summary = elements.details.querySelector("summary");
  const render = (): void => {
    elements.list.replaceChildren();
    const entries = [...retained.values()].sort((left, right) => left.id - right.id).slice(-24);
    for (const belief of beliefs) {
      const item = document.createElement("li");
      item.className = "experience-entry experience-belief";
      const marker = document.createElement("span");
      marker.className = "experience-marker";
      marker.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.className = "experience-text";
      text.textContent = belief.text;
      const meta = document.createElement("span");
      meta.className = "experience-meta";
      meta.textContent = `信念 · 期望 ${(belief.expectation * 100).toFixed(1)}% · 频率 ${(belief.frequency * 100).toFixed(1)}% · 信度 ${(belief.confidence * 100).toFixed(1)}% · NAR ${belief.narTime}`;
      item.append(marker, text, meta);
      elements.list.append(item);
    }
    if (entries.length > 0) {
      const rawItem = document.createElement("li");
      rawItem.className = "experience-raw-events";
      const rawDetails = document.createElement("details");
      const rawSummary = document.createElement("summary");
      rawSummary.textContent = `原始内部事件 · ${entries.length}`;
      const rawList = document.createElement("ol");
      rawList.className = "experience-raw-list";
      rawDetails.append(rawSummary, rawList);
      rawItem.append(rawDetails);
      elements.list.append(rawItem);
      for (const event of entries) {
        const item = document.createElement("li");
        item.className = `experience-entry experience-raw-event experience-raw-${event.kind}`;
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
        const evidenceText = event.evidence ?? "";
        if (evidenceText.length > 0) {
          const evidence = document.createElement("details");
          evidence.className = "experience-evidence";
          const evidenceSummary = document.createElement("summary");
          evidenceSummary.textContent = "事件依据";
          const raw = document.createElement("code");
          raw.textContent = evidenceText;
          evidence.append(evidenceSummary, raw);
          item.append(evidence);
        }
        rawList.append(item);
      }
    }
    const latest = entries.at(-1);
    elements.status.value = beliefs.length > 0 ? `Top ${beliefs.length} 信念` : latest === undefined ? "尚未观察到" : `${experienceKindLabel(latest.kind)} · ${experienceSourceLabel(latest.source)}`;
    elements.status.textContent = elements.status.value;
    elements.meta.textContent = beliefs.length > 0
      ? `概念袋信念 Top-N · 显示 ${beliefs.length} 条 · 原始事件按需展开`
      : `概念袋信念 Top-N · 展开后读取 · 原始事件 ${entries.length} 条`;
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
    setBeliefs(nextBeliefs) {
      beliefs = [...nextBeliefs];
      render();
    },
    reset() {
      retained.clear();
      beliefs = [];
      render();
    },
    dispose() {
      summary?.removeEventListener("click", onSummaryClick);
    },
  };
}
