/*
 * GPL-3.0-or-later adaptation of the active SimNAR Microworld.
 * Original OpenNARS lab authors; annotated reference by Tessergon.
 * See COPYING-GPL-3.0.txt.
 */

import {
  GOOD_FOOD_TYPE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  applyActionAndAdvance,
  applyManualControl,
  collectPerceptionAndReward,
  createRandom,
  createWorld,
  moveObjectTo,
  selectObject,
  type WorldState,
} from "./microworld/simulation.ts";
import type { ReasonerSnapshot } from "./diagnostics/reasoner-snapshot.ts";
import { mountIcons, setIcon } from "./ui/icons.ts";
import { RuntimeTelemetryView } from "./ui/runtime-telemetry.ts";
import { MICROWORLD_DEFAULT_TPS, MICROWORLD_MAX_TPS, MICROWORLD_MIN_SMOOTH_TPS } from "./microworld/runtime-config.ts";
import { MICROWORLD_STARTER_PRIORS } from "./microworld/nars-priors.ts";
import { nextWorldStepDeadline } from "./world-clock.ts";
import { initialDemoSeed } from "./demo-seed.ts";

type MicroworldWorkerEvent = {
  type: string;
  cyclesPerStep?: number;
  kind?: string;
  text?: string;
  step?: number;
  action?: number;
  operator?: string | null;
  source?: string;
  actionSource?: string;
  elapsedMs?: number;
  cycles?: number;
  narTime?: string;
  message?: string;
  reasoner?: ReasonerSnapshot;
};
type Scale = { x: number; y: number; bounds: DOMRect };
type ActionCode = 0 | 1 | 2 | 3;

function element<T extends Element>(selector: string): T {
  const found = document.querySelector(selector);
  if (found === null) throw new Error(`Required Microworld element not found: ${selector}`);
  return found as T;
}

const elements = {
  body: document.body,
  runtimePill: element<HTMLElement>(".runtime-pill"),
  runtimeState: element<HTMLElement>("#runtime-state"),
  canvas: element<HTMLCanvasElement>("#world-canvas"),
  stepCount: element<HTMLOutputElement>("#step-count"),
  worldStatus: element<HTMLElement>("#world-status"),
  latency: element<HTMLElement>("#step-latency"),
  runToggle: element<HTMLButtonElement>("#run-toggle"),
  runIcon: element<HTMLElement>("#run-icon"),
  runLabel: element<HTMLElement>("#run-label"),
  stepOnce: element<HTMLButtonElement>("#step-once"),
  reset: element<HTMLButtonElement>("#reset-run"),
  newSeed: element<HTMLButtonElement>("#new-seed"),
  knowledgeToggle: element<HTMLButtonElement>("#knowledge-toggle"),
  knowledgeLabel: element<HTMLElement>("#knowledge-label"),
  speed: element<HTMLInputElement>("#speed-input"),
  speedValue: element<HTMLOutputElement>("#speed-value"),
  sensorGrid: element<HTMLElement>("#sensor-grid"),
  sensorFocus: element<HTMLOutputElement>("#sensor-focus"),
  operation: element<HTMLOutputElement>("#current-operation"),
  operationDetail: element<HTMLElement>("#operation-detail"),
  sourceTag: element<HTMLElement>("#decision-source"),
  reward: element<HTMLOutputElement>("#reward-state"),
  goodCount: element<HTMLElement>("#good-count"),
  badCount: element<HTMLElement>("#bad-count"),
  foodRatio: element<HTMLElement>("#food-ratio"),
  ratioFill: element<HTMLElement>("#ratio-fill"),
  log: element<HTMLOListElement>("#nars-log"),
  logFilters: [...document.querySelectorAll<HTMLButtonElement>("[data-log-filter]")],
  clearLog: element<HTMLButtonElement>("#clear-log"),
  aboutToggle: element<HTMLButtonElement>("#about-toggle"),
  aboutCopy: element<HTMLElement>("#about-copy"),
  manualButtons: [...document.querySelectorAll<HTMLButtonElement>("[data-manual-control]")],
  narsCycles: element<HTMLInputElement>("#nars-cycles"),
  narsCyclesValue: element<HTMLOutputElement>("#nars-cycles-value"),
  narsBabble: element<HTMLInputElement>("#nars-babble"),
  narsBabbleValue: element<HTMLOutputElement>("#nars-babble-value"),
  fps: element<HTMLOutputElement>("#fps-hud"),
  tps: element<HTMLOutputElement>("#tps-hud"),
  rps: element<HTMLOutputElement>("#rps-hud"),
  rateHud: element<HTMLElement>("#rate-hud"),
  tpsTarget: element<HTMLOutputElement>("#tps-target"),
  tpsRatio: element<HTMLOutputElement>("#tps-ratio"),
  toggleRateHud: element<HTMLButtonElement>("#toggle-rate-hud"),
  fpsBar: element<HTMLElement>("#fps-bar"),
  tpsBar: element<HTMLElement>("#tps-bar"),
  rpsBar: element<HTMLElement>("#rps-bar"),
  runtimeMode: element<HTMLSelectElement>("#runtime-mode"),
  runtimeModeValue: element<HTMLOutputElement>("#runtime-mode-value"),
  runtimeLatency: element<HTMLOutputElement>("#runtime-latency"),
  runtimePending: element<HTMLOutputElement>("#runtime-pending"),
  pageMemory: element<HTMLOutputElement>("#page-memory"),
  concepts: element<HTMLOutputElement>("#concept-count"),
  taskBags: element<HTMLOutputElement>("#task-bags"),
};
const telemetry = new RuntimeTelemetryView({
  fps: elements.fps,
  tps: elements.tps,
  rps: elements.rps,
  tpsTarget: elements.tpsTarget,
  tpsRatio: elements.tpsRatio,
  fpsBar: elements.fpsBar,
  tpsBar: elements.tpsBar,
  rpsBar: elements.rpsBar,
  pageMemory: elements.pageMemory,
  concepts: elements.concepts,
  taskBags: elements.taskBags,
});

function requireCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const result = canvas.getContext("2d", { alpha: false });
  if (result === null) throw new Error("Canvas 2D context is unavailable");
  return result;
}
const context = requireCanvasContext(elements.canvas);
const sprites: Record<string, HTMLImageElement> = {
  agent: loadSprite("./assets/agent.png"),
  good: loadSprite("./assets/food.png"),
  bad: loadSprite("./assets/fire.png"),
};

const SENSOR_LABELS = ["G1", "G2", "G3", "B1", "B2", "B3"];
const LOG_LIMIT = 180;
const DRAW_INTERVAL_MS = 1000 / 30;
const INITIAL_SEED = initialDemoSeed(location.search, randomSeed);
const INITIAL_STARTER_KNOWLEDGE = new URLSearchParams(location.search).get("knowledge") === "starter";
const state: {
  seed: number;
  world: WorldState;
  random: () => number;
  worker: Worker | null;
  workerGeneration: number;
  running: boolean;
  pending: boolean;
  requested: boolean;
  lastStepAt: number;
  nextStepAt: number;
  lastDrawAt: number;
  speed: number;
  narsCycles: number;
  babbleProbability: number;
  starterKnowledge: boolean;
  camera: { zoom: number; x: number; y: number };
  pointer: { button: number; x: number; y: number } | null;
  objectDragId: string | null;
  logFilter: string;
  currentOperation: string;
  operationSource: string;
  lastLatency: number;
  lastNarTime: string;
  totalStepMs: number;
  measuredSteps: number;
  renderRequested: boolean;
  runtimeMode: "sync" | "async";
  queuedAction: ActionCode;
} = {
  seed: INITIAL_SEED,
  world: createWorld(INITIAL_SEED),
  random: createRandom(INITIAL_SEED ^ 0x2d2d304),
  worker: null,
  workerGeneration: 0,
  running: true,
  pending: false,
  requested: false,
  lastStepAt: 0,
  nextStepAt: 0,
  lastDrawAt: 0,
  speed: MICROWORLD_DEFAULT_TPS,
  narsCycles: Number(elements.narsCycles.value),
  babbleProbability: Number(elements.narsBabble.value) / 100,
  starterKnowledge: INITIAL_STARTER_KNOWLEDGE,
  camera: { zoom: 1, x: 0, y: 0 },
  pointer: null,
  objectDragId: null,
  logFilter: "all",
  currentOperation: "等待第一步",
  operationSource: "WAITING",
  lastLatency: 0,
  totalStepMs: 0,
  measuredSteps: 0,
  lastNarTime: "0",
  renderRequested: true,
  runtimeMode: "sync",
  queuedAction: 0,
};

function randomSeed(): number {
  return globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] || 1
    : (Date.now() >>> 0) || 1;
}

function loadSprite(source: string): HTMLImageElement {
  const image = new Image();
  image.src = source;
  image.addEventListener("load", requestRender);
  return image;
}

function setRuntime(stateName: string, label: string): void {
  elements.runtimePill.classList.toggle("ready", stateName === "ready");
  elements.runtimePill.classList.toggle("fault", stateName === "fault");
  elements.runtimeState.textContent = label;
}

function appendLog(kind: string, text: string, step = state.world.tick): void {
  const item = document.createElement("li");
  item.className = "log-entry";
  item.dataset.kind = kind;
  item.dataset.step = String(step);

  const time = document.createElement("time");
  time.textContent = String(step).padStart(5, "0");
  const content = document.createElement("span");
  content.textContent = text;
  item.append(time, content);
  item.hidden = !matchesFilter(kind);
  elements.log.append(item);
  while (elements.log.children.length > LOG_LIMIT) elements.log.firstElementChild?.remove();
  elements.log.scrollTop = elements.log.scrollHeight;
}

function matchesFilter(kind: string): boolean {
  if (state.logFilter === "all") return true;
  if (state.logFilter === "operation") return kind === "operation" || kind === "fault";
  return kind === "learning" || kind === "reward";
}

function refreshLogFilter(): void {
  for (const item of elements.log.children) (item as HTMLElement).hidden = !matchesFilter((item as HTMLElement).dataset.kind ?? "system");
  elements.logFilters.forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.logFilter === state.logFilter));
  });
}

function setRunning(isRunning: boolean): void {
  state.running = isRunning;
  setIcon(elements.runIcon, isRunning ? "pause" : "play");
  elements.runLabel.textContent = isRunning ? "暂停" : "继续";
  elements.runToggle.setAttribute("aria-label", isRunning ? "暂停模拟" : "继续模拟");
  elements.runToggle.title = isRunning ? "暂停" : "继续";
  elements.worldStatus.textContent = state.pending ? "正在推理" : isRunning ? "运行中" : "已暂停";
  elements.body.classList.toggle("paused", !isRunning);
  state.nextStepAt = performance.now();
}

function updateTelemetry(): void {
  const world = state.world;
  if (!world) return;
  elements.stepCount.value = String(world.tick).padStart(6, "0");
  elements.stepCount.textContent = elements.stepCount.value;

  const maxSensor = Math.max(...world.sensors);
  const focusIndex = maxSensor > 0 ? world.sensors.indexOf(maxSensor) : -1;
  elements.sensorFocus.textContent = focusIndex < 0 ? "暂无目标" : `${SENSOR_LABELS[focusIndex]} · ${(maxSensor * 100).toFixed(0)}%`;
  elements.sensorGrid.replaceChildren();
  world.sensors.forEach((value, index) => {
    const cell = document.createElement("span");
    cell.className = `sensor-cell${index >= 3 ? " negative" : ""}${value > 0.1 ? " active" : ""}`;
    cell.style.setProperty("--sensor-level", String(value));
    cell.textContent = SENSOR_LABELS[index];
    cell.title = `${index >= 3 ? "坏食物" : "好食物"} 感受点 ${index % 3 + 1}: ${(value * 100).toFixed(0)}%`;
    elements.sensorGrid.append(cell);
  });

  const ratio = world.counters.good / Math.max(1, world.counters.bad);
  elements.goodCount.textContent = String(world.counters.ateGood);
  elements.badCount.textContent = String(world.counters.ateBad);
  elements.foodRatio.textContent = ratio.toFixed(2);
  elements.ratioFill.style.width = `${Math.max(6, Math.min(100, (ratio / (ratio + 1)) * 100))}%`;
  if (world.lastRewardType === "good") elements.reward.textContent = "+1 满足";
  else if (world.lastRewardType === "bad") elements.reward.textContent = "-1 满足 / 健康";
  else if (world.tick > 0) elements.reward.textContent = "0 / 无碰撞";

  elements.latency.textContent = `NARS ${state.lastLatency.toFixed(0)} ms / ${state.narsCycles} cycles`;
  elements.operation.value = state.currentOperation;
  elements.sourceTag.textContent = state.operationSource;
  elements.sourceTag.dataset.source = state.operationSource;
  elements.operationDetail.textContent = `步骤 ${world.tick} · NAR 时钟 ${state.lastNarTime ?? "0"}`
    + (state.runtimeMode === "async" && state.pending ? " · NARS 滞后 / 推理待完成" : "");
  elements.runtimeModeValue.value = state.runtimeMode === "async" ? "异步" : "同步";
  elements.runtimeModeValue.textContent = elements.runtimeModeValue.value;
  elements.runtimeLatency.value = `${state.lastLatency.toFixed(0)} ms`;
  elements.runtimeLatency.textContent = elements.runtimeLatency.value;
  elements.runtimePending.value = state.pending ? "推理中" : "空闲";
  elements.runtimePending.textContent = elements.runtimePending.value;
}

function newWorker(seed: number): void {
  state.workerGeneration += 1;
  const generation = state.workerGeneration;
  state.worker?.terminate();
  const worker = new Worker("./microworld-worker.js");
  state.worker = worker;
  state.pending = false;
  state.requested = false;
  worker.addEventListener("message", ({ data }: MessageEvent<MicroworldWorkerEvent>) => {
    if (generation !== state.workerGeneration || !data) return;
    if (data.type === "booting") {
      setRuntime("booting", "启动推理器");
      return;
    }
    if (data.type === "ready") {
      setRuntime("ready", "推理器在线");
      appendLog("system", `NARS 已就绪；每环境步 ${data.cyclesPerStep} 个推理周期。`, 0);
      if (state.requested) requestStep();
      return;
    }
    if (data.type === "log") {
      const logKind = data.kind?.startsWith("REWARD") || data.kind === "HEALTH" ? "reward"
        : data.kind === "SENSOR" || data.kind === "GOAL" ? "learning"
          : data.kind === "EXE" || data.kind === "UNEXECUTABLE" || data.kind === "ANSWER" || data.kind === "BABBLE" ? "operation" : "system";
      appendLog(logKind, `[${data.kind}] ${data.text}`, data.step);
      return;
    }
    if (data.type === "operation") {
      const source = data.source === "NARS" ? "NARS" : (data.source ?? "unknown").toUpperCase();
      state.currentOperation = `${data.operator ?? "?"}({SELF})`;
      state.operationSource = source;
      appendLog("operation", `[EXE] ${data.operator ?? "?"}({SELF}) · ${source} / 已执行`, data.step);
      updateTelemetry();
      return;
    }
    if (data.type === "step-complete") {
      state.pending = false;
      telemetry.inference(Number(data.cycles ?? state.narsCycles));
      state.lastLatency = Number(data.elapsedMs) || 0;
      state.lastNarTime = data.narTime ?? "0";
      telemetry.updateReasoner(data.reasoner);
      state.totalStepMs += state.lastLatency;
      state.measuredSteps += 1;
      state.currentOperation = data.operator ? `${data.operator}({SELF})` : "本步未发出操作";
      state.operationSource = (data.actionSource ?? "idle") === "idle" ? "IDLE" : (data.actionSource ?? "NARS").toUpperCase();
      if (state.runtimeMode === "sync") {
        applyActionAndAdvance(state.world, data.action ?? 0);
        telemetry.environmentTick(performance.now());
      }
      else state.queuedAction = (data.action ?? 0) as ActionCode;
      if (state.runtimeMode === "async" && state.running) elements.worldStatus.textContent = "异步运行 · NARS 已完成";
      updateTelemetry();
      if (state.running) {
        // Keep the world clock fixed like Processing's frameRate(50): inference
        // consumes the current period instead of being added to the next one.
        state.nextStepAt = nextWorldStepDeadline(state.nextStepAt, performance.now(), state.speed);
      }
      else elements.worldStatus.textContent = "已暂停";
      requestRender();
      return;
    }
    if (data.type === "fault") {
      state.pending = false;
      state.running = false;
      setRuntime("fault", "推理异常");
      elements.worldStatus.textContent = "需要重置";
      appendLog("fault", data.message ?? "Unknown NARS error", data.step);
      requestRender();
    }
  });
  worker.addEventListener("error", (event: ErrorEvent) => {
    if (generation !== state.workerGeneration) return;
    state.pending = false;
    state.running = false;
    setRuntime("fault", "Worker 异常");
    appendLog("fault", event.message || "Microworld Worker crashed");
  });
  worker.postMessage({ type: "reset", seed,
    priorRules: state.starterKnowledge ? MICROWORLD_STARTER_PRIORS : [] });
}

function requestStep(): void {
  if (state.pending || !state.worker) return;
  if (elements.runtimePill.classList.contains("fault")) return;
  if (elements.runtimeState.textContent === "启动推理器") {
    state.requested = true;
    return;
  }

  const perception = collectPerceptionAndReward(state.world, state.random);
  state.world.sensors = perception.sensors;
  state.pending = true;
  state.requested = false;
  elements.worldStatus.textContent = "正在推理";
  updateTelemetry();
  requestRender();
  state.worker.postMessage({
    type: "step",
    sensors: perception.sensors,
    reward: perception.reward,
    seed: state.seed,
    cycles: state.narsCycles,
    babble: state.babbleProbability,
  });
}

function advanceAsyncWorld(): void {
  const perception = collectPerceptionAndReward(state.world, state.random);
  state.world.sensors = perception.sensors;
  applyActionAndAdvance(state.world, state.queuedAction);
  state.queuedAction = 0;
  telemetry.environmentTick(performance.now());
  updateTelemetry();
  requestRender();
}

function resetRun(seed = state.seed): void {
  state.seed = Number(seed) >>> 0 || 1;
  state.world = createWorld(state.seed);
  state.random = createRandom(state.seed ^ 0x2d2d304);
  state.camera = { zoom: 1, x: 0, y: 0 };
  state.currentOperation = "等待第一步";
  state.operationSource = "WAITING";
  state.lastLatency = 0;
  state.lastNarTime = "0";
  state.totalStepMs = 0;
  state.measuredSteps = 0;
  telemetry.resetRates();
  state.queuedAction = 0;
  state.lastStepAt = 0;
  state.nextStepAt = performance.now();
  state.pointer = null;
  state.objectDragId = null;
  elements.log.replaceChildren();
  updateTelemetry();
  newWorker(state.seed);
  setRunning(true);
  appendLog("system", `新实验开始 · seed ${state.seed}`, 0);
  requestRender();
}

function canvasScale(): Scale {
  const bounds = elements.canvas.getBoundingClientRect();
  return { x: WORLD_WIDTH / bounds.width, y: WORLD_HEIGHT / bounds.height, bounds };
}

function screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
  const { bounds } = canvasScale();
  const screenX = (clientX - bounds.left) * WORLD_WIDTH / bounds.width;
  const screenY = (clientY - bounds.top) * WORLD_HEIGHT / bounds.height;
  return {
    x: (screenX - WORLD_WIDTH / 2 - state.camera.x) / state.camera.zoom + WORLD_WIDTH / 2,
    y: (screenY - WORLD_HEIGHT / 2 - state.camera.y) / state.camera.zoom + WORLD_HEIGHT / 2,
  };
}

function drawSprite(sprite: HTMLImageElement, x: number, y: number, size: number, rotation = 0, fallback = "#ffffff"): void {
  context.save();
  context.translate(x, y);
  context.rotate(rotation + Math.PI);
  if (sprite.complete && sprite.naturalWidth > 0) {
    context.imageSmoothingEnabled = false;
    context.drawImage(sprite, -size / 2, -size / 2, size, size);
  } else {
    context.fillStyle = fallback;
    context.beginPath();
    context.arc(0, 0, size / 2, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function renderWorld(): void {
  const pixelRatio = window.devicePixelRatio || 1;
  const bounds = elements.canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width * pixelRatio));
  const height = Math.max(1, Math.round(bounds.height * pixelRatio));
  if (elements.canvas.width !== width || elements.canvas.height !== height) {
    elements.canvas.width = width;
    elements.canvas.height = height;
  }

  context.setTransform(width / WORLD_WIDTH, 0, 0, height / WORLD_HEIGHT, 0, 0);
  context.fillStyle = "#898b82";
  context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  context.save();
  context.translate(WORLD_WIDTH / 2 + state.camera.x, WORLD_HEIGHT / 2 + state.camera.y);
  context.scale(state.camera.zoom, state.camera.zoom);
  context.translate(-WORLD_WIDTH / 2, -WORLD_HEIGHT / 2);

  context.strokeStyle = "rgba(34, 42, 35, 0.14)";
  context.lineWidth = 1;
  for (let x = 40; x < WORLD_WIDTH; x += 40) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, WORLD_HEIGHT); context.stroke();
  }
  for (let y = 40; y < WORLD_HEIGHT; y += 40) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(WORLD_WIDTH, y); context.stroke();
  }
  context.strokeStyle = "rgba(247, 246, 227, 0.62)";
  context.lineWidth = 2;
  context.strokeRect(1, 1, WORLD_WIDTH - 2, WORLD_HEIGHT - 2);

  const agent = state.world.agent;
  if (agent.selected) {
    context.save();
    context.strokeStyle = "rgba(204, 57, 55, 0.9)";
    context.lineWidth = 1.3 / state.camera.zoom;
    for (const side of [-1, 1]) {
      const angle = agent.angle + side * state.world.viewAngle;
      context.beginPath();
      context.moveTo(agent.x, agent.y);
      context.lineTo(agent.x + Math.cos(angle) * state.world.viewDistance, agent.y + Math.sin(angle) * state.world.viewDistance);
      context.stroke();
    }
    context.restore();
  }

  for (const food of state.world.foods) {
    const isGood = food.type === GOOD_FOOD_TYPE;
    drawSprite(sprites[isGood ? "good" : "bad"], food.x, food.y, 25, food.angle, isGood ? "#c0ef4d" : "#ff684e");
    if (state.world.selectedObjectId === food.id) {
      context.strokeStyle = "rgba(29, 38, 31, 0.85)";
      context.lineWidth = 2 / state.camera.zoom;
      context.beginPath(); context.arc(food.x, food.y, 19, 0, Math.PI * 2); context.stroke();
    }
  }
  drawSprite(sprites.agent, agent.x, agent.y, 29, agent.angle, "#78c544");
  if (agent.selected) {
    context.strokeStyle = "#e44943";
    context.lineWidth = 1.5 / state.camera.zoom;
    context.beginPath(); context.arc(agent.x, agent.y, 19, 0, Math.PI * 2); context.stroke();
  }

  context.restore();
}

function requestRender(): void {
  state.renderRequested = true;
}

function animationFrame(now: number): void {
  telemetry.frame(now);
  if (state.renderRequested || now - state.lastDrawAt >= DRAW_INTERVAL_MS) {
    renderWorld();
    state.lastDrawAt = now;
    state.renderRequested = false;
  }

  if (state.runtimeMode === "async" && state.running && now >= state.nextStepAt) {
    advanceAsyncWorld();
    state.nextStepAt = now + 1000 / state.speed;
    if (!state.pending) requestStep();
  } else if (state.runtimeMode === "sync" && state.running && !state.pending && now >= state.nextStepAt) {
    requestStep();
  }

  requestAnimationFrame(animationFrame);
}

function startPointer(event: PointerEvent): void {
  event.preventDefault();
  const position = screenToWorld(event.clientX, event.clientY);
  if (event.button === 2) {
    state.pointer = { button: 2, x: event.clientX, y: event.clientY };
    elements.canvas.classList.add("panning");
  } else {
    const object = selectObject(state.world, position.x, position.y);
    state.pointer = { button: 0, x: event.clientX, y: event.clientY };
    state.objectDragId = object?.id ?? null;
    if (object) elements.canvas.classList.add("dragging-object");
  }
  elements.canvas.setPointerCapture(event.pointerId);
  updateTelemetry();
  requestRender();
}

function movePointer(event: PointerEvent): void {
  if (!state.pointer) return;
  if (state.pointer.button === 2) {
    const { bounds } = canvasScale();
    state.camera.x += (event.clientX - state.pointer.x) * WORLD_WIDTH / bounds.width;
    state.camera.y += (event.clientY - state.pointer.y) * WORLD_HEIGHT / bounds.height;
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
  } else if (state.objectDragId) {
    const position = screenToWorld(event.clientX, event.clientY);
    moveObjectTo(state.world, state.objectDragId, position.x, position.y);
  }
  requestRender();
}

function endPointer(event: PointerEvent): void {
  if (elements.canvas.hasPointerCapture(event.pointerId)) elements.canvas.releasePointerCapture(event.pointerId);
  state.pointer = null;
  state.objectDragId = null;
  elements.canvas.classList.remove("dragging-object", "panning");
}

function handleCanvasZoom(event: WheelEvent): void {
  event.preventDefault();
  const point = screenToWorld(event.clientX, event.clientY);
  const screenBefore = {
    x: (point.x - WORLD_WIDTH / 2) * state.camera.zoom + WORLD_WIDTH / 2 + state.camera.x,
    y: (point.y - WORLD_HEIGHT / 2) * state.camera.zoom + WORLD_HEIGHT / 2 + state.camera.y,
  };
  state.camera.zoom = Math.max(0.65, Math.min(2.5, state.camera.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
  state.camera.x = screenBefore.x - ((point.x - WORLD_WIDTH / 2) * state.camera.zoom + WORLD_WIDTH / 2);
  state.camera.y = screenBefore.y - ((point.y - WORLD_HEIGHT / 2) * state.camera.zoom + WORLD_HEIGHT / 2);
  requestRender();
}

function directControl(key: string): boolean {
  if (!applyManualControl(state.world, key)) return false;
  telemetry.environmentTick(performance.now());
  state.currentOperation = "手动运动控制";
  state.operationSource = "MANUAL";
  elements.operationDetail.textContent = "直接调整虫体；NARS 决策保持独立";
  appendLog("system", `[MANUAL] ${key} · 物理状态已调整`);
  updateTelemetry();
  requestRender();
  return true;
}

elements.runToggle.addEventListener("click", () => {
  setRunning(!state.running);
  elements.worldStatus.textContent = state.running ? "运行中" : "已暂停";
});
elements.stepOnce.addEventListener("click", () => {
  setRunning(false);
  elements.worldStatus.textContent = "单步推理";
  requestStep();
});
elements.reset.addEventListener("click", () => resetRun(state.seed));
elements.newSeed.addEventListener("click", () => resetRun(randomSeed()));
function updateKnowledgeControl(): void {
  elements.knowledgeToggle.setAttribute("aria-pressed", String(state.starterKnowledge));
  elements.knowledgeLabel.textContent = state.starterKnowledge ? "示例知识" : "空白探索";
  elements.knowledgeToggle.setAttribute("aria-label", state.starterKnowledge ? "切换为空白探索" : "启用示例知识");
}
elements.knowledgeToggle.addEventListener("click", () => {
  state.starterKnowledge = !state.starterKnowledge;
  updateKnowledgeControl();
  resetRun(state.seed);
});
elements.speed.addEventListener("input", () => {
  state.speed = Math.min(MICROWORLD_MAX_TPS, Math.max(MICROWORLD_MIN_SMOOTH_TPS, Number(elements.speed.value) || MICROWORLD_DEFAULT_TPS));
  elements.speed.value = String(state.speed);
  elements.speedValue.textContent = `${state.speed} 步/秒`;
  telemetry.setTargetTps(state.speed);
});
elements.toggleRateHud.addEventListener("click", () => { const hidden = elements.rateHud.classList.toggle("is-hidden"); elements.toggleRateHud.setAttribute("aria-label", hidden ? "显示速率 HUD" : "隐藏速率 HUD"); elements.toggleRateHud.title = hidden ? "显示速率 HUD" : "隐藏速率 HUD"; });
elements.runtimeMode.addEventListener("change", () => {
  state.runtimeMode = elements.runtimeMode.value === "async" ? "async" : "sync";
  state.queuedAction = 0;
  elements.worldStatus.textContent = state.runtimeMode === "async" ? "异步运行 · 等待 NARS" : "同步运行";
  elements.runtimeModeValue.value = state.runtimeMode === "async" ? "异步" : "同步";
  elements.runtimeModeValue.textContent = elements.runtimeModeValue.value;
  appendLog("system", state.runtimeMode === "async" ? "已切换异步节奏：世界按速度推进，NARS 操作稍后应用。" : "已切换同步节奏：环境步等待 NARS 完成。", state.world.tick);
  updateTelemetry();
});
elements.narsCyclesValue.value = `${state.narsCycles} cycles`;
elements.narsBabbleValue.value = `${Math.round(state.babbleProbability * 100)}%`;
elements.narsCycles.addEventListener("input", () => {
  state.narsCycles = Number(elements.narsCycles.value);
  elements.narsCyclesValue.value = `${state.narsCycles} cycles`;
  telemetry.setCyclesPerTick(state.narsCycles);
});
elements.narsBabble.addEventListener("input", () => {
  state.babbleProbability = Number(elements.narsBabble.value) / 100;
  elements.narsBabbleValue.value = `${elements.narsBabble.value}%`;
});
elements.canvas.addEventListener("pointerdown", startPointer);
elements.canvas.addEventListener("pointermove", movePointer);
elements.canvas.addEventListener("pointerup", endPointer);
elements.canvas.addEventListener("pointercancel", endPointer);
elements.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
elements.canvas.addEventListener("wheel", handleCanvasZoom, { passive: false });
elements.aboutToggle.addEventListener("click", () => {
  const expanded = elements.aboutToggle.getAttribute("aria-expanded") === "true";
  elements.aboutToggle.setAttribute("aria-expanded", String(!expanded));
  elements.aboutCopy.hidden = expanded;
});
elements.clearLog.addEventListener("click", () => elements.log.replaceChildren());
elements.logFilters.forEach((button) => button.addEventListener("click", () => {
  state.logFilter = button.dataset.logFilter ?? "all";
  refreshLogFilter();
}));
elements.manualButtons.forEach((button) => button.addEventListener("click", () => directControl(button.dataset.manualControl ?? "")));

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement) return;
  const key = event.key.toLowerCase();
  if (key === " ") {
    event.preventDefault();
    setRunning(!state.running);
  } else if (["t", "g", "f", "h"].includes(key)) {
    event.preventDefault();
    directControl(key);
  } else if (key === "r") {
    resetRun(state.seed);
  }
});

function boot() {
  mountIcons();
  updateKnowledgeControl();
  elements.speed.min = String(MICROWORLD_MIN_SMOOTH_TPS);
  elements.speed.max = String(MICROWORLD_MAX_TPS);
  elements.speed.value = String(MICROWORLD_DEFAULT_TPS);
  elements.speedValue.textContent = `${MICROWORLD_DEFAULT_TPS} 步/秒`;
  telemetry.setTargetTps(MICROWORLD_DEFAULT_TPS);
  telemetry.setCyclesPerTick(state.narsCycles);
  state.world = createWorld(state.seed);
  state.random = createRandom(state.seed ^ 0x2d2d304);
  for (let index = 0; index < 6; index += 1) {
    const cell = document.createElement("span");
    cell.className = `sensor-cell${index >= 3 ? " negative" : ""}`;
    cell.textContent = SENSOR_LABELS[index];
    elements.sensorGrid.append(cell);
  }
  elements.speedValue.textContent = `${state.speed} 步/秒`;
  appendLog("system", `正在载入 NARS · seed ${state.seed}`, 0);
  newWorker(state.seed);
  updateTelemetry();
  requestAnimationFrame(animationFrame);
}

boot();
window.addEventListener("pagehide", () => telemetry.dispose(), { once: true });
