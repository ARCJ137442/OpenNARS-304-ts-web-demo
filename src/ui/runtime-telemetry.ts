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
  tps: HTMLOutputElement;
  tpsTarget: HTMLOutputElement;
  tpsRatio: HTMLOutputElement;
  rps: HTMLOutputElement;
  fpsBar: HTMLElement;
  tpsBar: HTMLElement;
  rpsBar: HTMLElement;
  pageMemory: HTMLOutputElement;
  concepts: HTMLOutputElement;
  taskBags: HTMLOutputElement;
};

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  private tickStart = 0;
  private tickCount = 0;
  private tpsValue = 0;
  private rpsValue = 0;
  private targetTps = 1;

  constructor(private readonly elements: RuntimeTelemetryElements) {
    elements.fps.value = "-- FPS";
    elements.fps.textContent = "-- FPS";
    for (const [output, bar] of [[elements.fps, elements.fpsBar], [elements.tps, elements.tpsBar], [elements.rps, elements.rpsBar]] as const) {
      output.textContent = "--";
      output.value = "--";
      bar.style.setProperty("--rate", "0%");
    }
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
    this.elements.fps.value = `${fps} FPS`;
    this.elements.fps.textContent = this.elements.fps.value;
    this.elements.fpsBar.style.setProperty("--rate", `${Math.min(100, fps / 60 * 100)}%`);
    this.elements.fps.dataset.rate = fps >= 45 ? "good" : "lag";
    this.elements.fpsBar.dataset.rate = this.elements.fps.dataset.rate;
    this.frameStart = now;
    this.frameCount = 0;
  }

  environmentTick(now: number): void {
    this.tickCount += 1;
    if (this.tickStart === 0) this.tickStart = now;
    const elapsed = now - this.tickStart;
    if (elapsed < 500) return;
    this.tpsValue = this.tickCount * 1000 / elapsed;
    this.renderTps();
    this.tickStart = now;
    this.tickCount = 0;
  }

  setTargetTps(target: number): void {
    this.targetTps = Math.max(0.1, Number(target) || 1);
    this.elements.tpsTarget.value = `${this.targetTps.toFixed(1)} TPS`;
    this.elements.tpsTarget.textContent = this.elements.tpsTarget.value;
    this.renderTps();
  }

  private renderTps(): void {
    this.elements.tps.value = `${this.tpsValue.toFixed(1)} TPS`;
    this.elements.tps.textContent = this.elements.tps.value;
    const ratio = this.tpsValue / this.targetTps;
    this.elements.tpsRatio.value = `${Math.round(ratio * 100)}%`;
    this.elements.tpsRatio.textContent = this.elements.tpsRatio.value;
    const rate = ratio >= 0.5 ? "good" : "lag";
    this.elements.tpsRatio.dataset.rate = rate;
    this.elements.tps.dataset.rate = rate;
    this.elements.tpsBar.dataset.rate = rate;
    this.elements.tpsBar.style.setProperty("--rate", `${Math.min(100, Math.max(0, ratio * 100))}%`);
  }

  inference(cycles: number, elapsedMs: number): void {
    if (!(elapsedMs > 0) || !(cycles > 0)) return;
    this.rpsValue = cycles * 1000 / elapsedMs;
    this.elements.rps.value = `${this.rpsValue.toFixed(1)} RPS`;
    this.elements.rps.textContent = this.elements.rps.value;
    this.elements.rpsBar.style.setProperty("--rate", `${Math.min(100, this.rpsValue / 120 * 100)}%`);
    this.elements.rps.dataset.rate = this.rpsValue >= 90 ? "good" : "lag";
    this.elements.rpsBar.dataset.rate = this.elements.rps.dataset.rate;
  }

  resetRates(): void {
    this.frameStart = 0;
    this.frameCount = 0;
    this.tickStart = 0;
    this.tickCount = 0;
    this.tpsValue = 0;
    this.rpsValue = 0;
    for (const [output, bar, placeholder] of [[this.elements.fps, this.elements.fpsBar, "-- FPS"], [this.elements.tps, this.elements.tpsBar, "-- TPS"], [this.elements.rps, this.elements.rpsBar, "-- RPS"]] as const) {
      output.value = placeholder;
      output.textContent = placeholder;
      output.dataset.rate = "lag";
      bar.dataset.rate = "lag";
      bar.style.setProperty("--rate", "0%");
    }
    this.renderTps();
  }

  updateReasoner(snapshot: ReasonerSnapshot | undefined): void {
    if (!snapshot) return;
    const concepts = snapshot.conceptCapacity > 0
      ? `${snapshot.concepts.toLocaleString()} / ${snapshot.conceptCapacity.toLocaleString()}`
      : snapshot.concepts.toLocaleString();
    this.elements.concepts.value = concepts;
    this.elements.concepts.textContent = concepts;
    this.elements.taskBags.value = `新 ${snapshot.novelTasks} · 序 ${snapshot.sequenceTasks} · 操 ${snapshot.recentOperations}`;
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
