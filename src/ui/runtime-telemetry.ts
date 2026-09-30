import type { ReasonerSnapshot } from "../diagnostics/reasoner-snapshot.ts";

type BrowserMemory = {
  usedJSHeapSize?: number;
};

type MeasuredMemory = {
  bytes: number;
};

type ExtendedPerformance = Performance & {
  memory?: BrowserMemory;
  measureUserAgentSpecificMemory?: () => Promise<MeasuredMemory>;
};

type RuntimeTelemetryElements = {
  fps: HTMLOutputElement;
  pageMemory: HTMLOutputElement;
  concepts: HTMLOutputElement;
  taskBags: HTMLOutputElement;
};

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function readPageMemory(): Promise<{ text: string; detail: string }> {
  const performanceApi = performance as ExtendedPerformance;
  if (performanceApi.measureUserAgentSpecificMemory && crossOriginIsolated) {
    try {
      const result = await performanceApi.measureUserAgentSpecificMemory();
      return { text: formatMegabytes(result.bytes), detail: "页面与同源 Worker 估算值" };
    } catch {
      // Fall through to the browser's per-page heap estimate.
    }
  }
  const usedBytes = performanceApi.memory?.usedJSHeapSize;
  if (typeof usedBytes === "number" && Number.isFinite(usedBytes)) {
    return { text: formatMegabytes(usedBytes), detail: "当前页面 JS 堆估算，不含其他进程资源" };
  }
  return { text: "不支持", detail: "此浏览器未提供页面内存采样 API" };
}

export class RuntimeTelemetryView {
  private frameStart = 0;
  private frameCount = 0;
  private sampleTimer = 0;
  private requestPending = false;

  constructor(private readonly elements: RuntimeTelemetryElements) {
    elements.fps.value = "-- FPS";
    elements.fps.textContent = "-- FPS";
    elements.pageMemory.value = "读取中";
    elements.pageMemory.textContent = "读取中";
    elements.concepts.value = "等待 NARS";
    elements.concepts.textContent = "等待 NARS";
    elements.taskBags.value = "等待 NARS";
    elements.taskBags.textContent = "等待 NARS";
    this.samplePageMemory();
    this.sampleTimer = window.setInterval(() => this.samplePageMemory(), 5000);
  }

  frame(now: number): void {
    this.frameCount += 1;
    if (this.frameStart === 0) {
      this.frameStart = now;
      return;
    }
    const elapsed = now - this.frameStart;
    if (elapsed < 1000) return;
    const fps = Math.round((this.frameCount * 1000) / elapsed);
    this.elements.fps.value = String(fps) + " FPS";
    this.elements.fps.textContent = this.elements.fps.value;
    this.frameStart = now;
    this.frameCount = 0;
  }

  updateReasoner(snapshot: ReasonerSnapshot | undefined): void {
    if (!snapshot) return;
    const concepts = snapshot.conceptCapacity > 0
      ? snapshot.concepts.toLocaleString() + " / " + snapshot.conceptCapacity.toLocaleString()
      : snapshot.concepts.toLocaleString();
    this.elements.concepts.value = concepts;
    this.elements.concepts.textContent = concepts;
    this.elements.taskBags.value = "新 " + snapshot.novelTasks
      + " · 序 " + snapshot.sequenceTasks
      + " · 操 " + snapshot.recentOperations;
    this.elements.taskBags.title = "新任务 · 时序任务 · 操作记录";
    this.elements.taskBags.textContent = this.elements.taskBags.value;
  }

  dispose(): void {
    window.clearInterval(this.sampleTimer);
  }

  private async samplePageMemory(): Promise<void> {
    if (this.requestPending) return;
    this.requestPending = true;
    try {
      const sample = await readPageMemory();
      this.elements.pageMemory.value = sample.text;
      this.elements.pageMemory.textContent = sample.text;
      this.elements.pageMemory.title = sample.detail;
    } finally {
      this.requestPending = false;
    }
  }
}
