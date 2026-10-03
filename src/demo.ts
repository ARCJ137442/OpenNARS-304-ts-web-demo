/* GPL-3.0-or-later game shell; source links and license terms appear per demo. */
import {
  DEMO_DEFINITIONS,
  advanceDemo,
  applyManualGameControl,
  buildNarsStep,
  createDemoState,
  type AlienState,
  type BandRobotState,
  type CartPoleState,
  type DemoId,
  type DemoState,
  type HuntState,
  type PongState,
} from "./games/models.ts";
import type { ExpansionState } from "./games/expansion-types.ts";
import type { EchoRelayState } from "./games/expansion-types.ts";
import { isDemoId } from "./data/demo-catalog.ts";
import { PerceptionCadence } from "./games/perception-cadence.ts";
import { mountIcons, setIcon } from "./ui/icons.ts";
import { RuntimeTelemetryView } from "./ui/runtime-telemetry.ts";
import { signalFeedback } from "./ui/semantic-feedback.ts";
import { nextWorldStepDeadline } from "./world-clock.ts";
import { initialDemoSeed } from "./demo-seed.ts";
import type { ReasonerSnapshot } from "./diagnostics/reasoner-snapshot.ts";

type LogKind = "operation" | "input" | "feedback" | "system" | "fault";
type WorkerEvent = {
  type: string;
  game?: string;
  actions?: string[];
  action?: string | null;
  source?: string;
  cycles?: number;
  narTime?: string;
  elapsedMs?: number;
  kind?: string;
  text?: string;
  step?: number;
  message?: string;
  reasoner?: ReasonerSnapshot;
};
type ManualAction = [label: string, command: string];
const ACTION_ICONS: Record<string, string> = {
  left: "arrow-left",
  right: "arrow-right",
  up: "arrow-up",
  down: "arrow-down",
  shoot: "arrow-up",
  pick: "hand",
  drop: "arrow-down",
  move: "arrow-up",
  turn_left: "rotate-ccw",
  turn_right: "rotate-cw",
  ping: "radio",
};

function element<T extends Element>(selector: string): T {
  const found = document.querySelector(selector);
  if (found === null) throw new Error(`Required demo element not found: ${selector}`);
  return found as T;
}

const candidate = new URLSearchParams(location.search).get("game") ?? "pong";
if (!isDemoId(candidate)) {
  location.replace("./");
  throw new RangeError("Unknown demo id: " + candidate);
}
const gameId = candidate;
const definition = DEMO_DEFINITIONS[gameId];
const perceptionCadence = definition.perceptionCadence === undefined ? null
  : new PerceptionCadence(definition.perceptionCadence.warmupTicks, definition.perceptionCadence.refreshEvery);

const ui = {
  title: element<HTMLElement>("#game-title"),
  subtitle: element<HTMLElement>("#game-subtitle"),
  family: element<HTMLElement>("#game-family"),
  runtime: element<HTMLElement>("#game-runtime"),
  runtimeLabel: element<HTMLElement>("#runtime-label"),
  canvas: element<HTMLCanvasElement>("#game-canvas"),
  step: element<HTMLOutputElement>("#game-step"),
  status: element<HTMLElement>("#game-status"),
  run: element<HTMLButtonElement>("#run-toggle"),
  runIcon: element<HTMLElement>("#run-icon"),
  runLabel: element<HTMLElement>("#run-label"),
  singleStep: element<HTMLButtonElement>("#step-once"),
  reset: element<HTMLButtonElement>("#reset-demo"),
  newSeed: element<HTMLButtonElement>("#new-seed"),
  speed: element<HTMLInputElement>("#speed"),
  speedLabel: element<HTMLOutputElement>("#speed-label"),
  cycles: element<HTMLInputElement>("#cycles-control"),
  cyclesLabel: element<HTMLOutputElement>("#cycles-label"),
  babble: element<HTMLInputElement>("#babble-control"),
  babbleLabel: element<HTMLOutputElement>("#babble-label"),
  manual: element<HTMLElement>("#manual-controls"),
  operation: element<HTMLOutputElement>("#operation-value"),
  source: element<HTMLOutputElement>("#operation-source"),
  opState: element<HTMLElement>("#operation-state"),
  sourceToggle: element<HTMLButtonElement>("#source-toggle"),
  sourceCopy: element<HTMLElement>("#source-copy"),
  scoreLabel: element<HTMLOutputElement>("#game-score-label"),
  metrics: element<HTMLElement>("#game-metrics"),
  sensors: element<HTMLElement>("#sensor-values"),
  sensorSummary: element<HTMLOutputElement>("#sensor-summary"),
  log: element<HTMLOListElement>("#game-log"),
  filters: [...document.querySelectorAll<HTMLButtonElement>("[data-filter]")],
  clearLog: element<HTMLButtonElement>("#clear-log"),
  fps: element<HTMLOutputElement>("#fps-hud"),
  tpsHud: element<HTMLOutputElement>("#tps-hud"),
  rpsHud: element<HTMLOutputElement>("#rps-hud"),
  fpsBar: element<HTMLElement>("#fps-bar"),
  tpsBar: element<HTMLElement>("#tps-bar"),
  rpsBar: element<HTMLElement>("#rps-bar"),
  rateHud: element<HTMLElement>("#rate-hud"),
  tpsTarget: element<HTMLOutputElement>("#tps-target"),
  tpsRatio: element<HTMLOutputElement>("#tps-ratio"),
  toggleRateHud: element<HTMLButtonElement>("#toggle-rate-hud"),
  pageMemory: element<HTMLOutputElement>("#page-memory"),
  concepts: element<HTMLOutputElement>("#concept-count"),
  taskBags: element<HTMLOutputElement>("#task-bags"),
  modeSync: element<HTMLInputElement>("#mode-sync"),
  modeAsync: element<HTMLInputElement>("#mode-async"),
  runtimeMode: element<HTMLOutputElement>("#runtime-mode"),
  runtimeQueue: element<HTMLOutputElement>("#runtime-queue"),
  lateActions: element<HTMLOutputElement>("#late-actions"),
  echoMapDetails: element<HTMLDetailsElement>("#echo-map-details"),
  echoTruthMap: element<HTMLCanvasElement>("#echo-truth-map"),
  echoKnownMap: element<HTMLCanvasElement>("#echo-known-map"),
};
const telemetry = new RuntimeTelemetryView({
  fps: ui.fps,
  tps: ui.tpsHud,
  tpsTarget: ui.tpsTarget,
  tpsRatio: ui.tpsRatio,
  rps: ui.rpsHud,
  fpsBar: ui.fpsBar,
  tpsBar: ui.tpsBar,
  rpsBar: ui.rpsBar,
  pageMemory: ui.pageMemory,
  concepts: ui.concepts,
  taskBags: ui.taskBags,
});

function requireCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const result = canvas.getContext("2d", { alpha: false });
  if (result === null) throw new Error("Canvas 2D context is unavailable");
  return result;
}
const context = requireCanvasContext(ui.canvas);

const state: {
  seed: number;
  model: DemoState;
  worker: Worker | null;
  generation: number;
  ready: boolean;
  running: boolean;
  pending: boolean;
  waitingForWorker: boolean;
  nextStep: number;
  speed: number;
  cycles: number;
  babble: number;
  filter: string;
  mode: "sync" | "async";
  requestTick: number;
  pendingSteps: number;
  lateActions: number;
  queuedAction: string | null;
} = {
  seed: initialDemoSeed(location.search, randomSeed), model: createDemoState(gameId), worker: null, generation: 0,
  ready: false, running: true, pending: false, waitingForWorker: true,
  nextStep: 0, speed: 20, cycles: definition.cycles, babble: definition.babble, filter: "all", mode: "sync", requestTick: 0, pendingSteps: 0, lateActions: 0, queuedAction: null,
};

function randomSeed(): number {
  return globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] || 1
    : (Date.now() >>> 0) || 1;
}

function addLog(kind: LogKind, text: string, step = state.model.tick): void {
  const row = document.createElement("li");
  row.className = "log-line";
  row.dataset.kind = kind;
  const time = document.createElement("time");
  time.textContent = String(step).padStart(5, "0");
  const message = document.createElement("span");
  message.textContent = text;
  row.append(time, message);
  row.hidden = state.filter !== "all" && state.filter !== kind;
  ui.log.append(row);
  while (ui.log.children.length > 160) ui.log.firstElementChild?.remove();
  ui.log.scrollTop = ui.log.scrollHeight;
}

function initializeWorker(): void {
  state.generation += 1;
  const generation = state.generation;
  state.worker?.terminate();
  state.worker = new Worker("./demo-worker.js");
  state.ready = false;
  state.pending = false;
  ui.runtime.classList.remove("ready", "fault");
      ui.runtimeLabel.textContent = "启动中";

  state.worker.addEventListener("message", ({ data }: MessageEvent<WorkerEvent>) => {
    if (generation !== state.generation || !data) return;
    if (data.type === "ready") {
      state.ready = true;
      ui.runtime.classList.add("ready");
      ui.runtimeLabel.textContent = "NARS 在线";
      addLog("system", `已注册 ${data.actions?.length ?? 0} 个操作`, 0);
      if (state.waitingForWorker) requestStep();
      return;
    }
    if (data.type === "log") {
      const kind: LogKind = data.kind === "EXE" || data.kind === "UNEXECUTABLE" ? "operation"
        : data.kind === "GOAL" || data.kind === "SENSOR" ? "input"
          : data.kind === "FEEDBACK" || data.kind === "ANSWER" || data.kind === "BABBLE" ? "feedback" : "system";
      addLog(kind, `[${data.kind ?? "LOG"}] ${data.text ?? ""}`, data.step ?? state.model.tick);
      return;
    }
    if (data.type === "operation") {
      const action = data.action ?? "unknown operation";
      ui.operation.value = `${action}({SELF})`;
      ui.source.value = "NARS / EXE";
      ui.opState.textContent = "NARS 操作符已执行";
      addLog("operation", `[EXECUTED] ${action}({SELF})`);
      signalFeedback(ui.operation.closest<HTMLElement>(".operation-monitor"), "reasoned");
      return;
    }
    if (data.type === "step-complete") {
      state.pending = false;
      state.pendingSteps = Math.max(0, state.pendingSteps - 1);
      telemetry.inference(Number(data.cycles ?? state.cycles));
      ui.operation.value = data.action ? `${data.action}({SELF})` : "本步未发出操作";
      ui.source.value = data.action ? data.source ?? "NARS" : "IDLE";
      ui.opState.textContent = `NAR ${data.narTime ?? "0"} · ${data.cycles ?? state.cycles} cycles · ${Number(data.elapsedMs ?? 0).toFixed(1)} ms`;
      if (data.action && data.source === "babble") signalFeedback(ui.operation.closest<HTMLElement>(".operation-monitor"), "exploratory");
      if (state.mode === "sync") {
        const result = advanceDemo(state.model, data.action ?? null);
        if (result.reward !== 0) signalFeedback(ui.metrics.closest<HTMLElement>(".metrics-monitor"), result.reward > 0 ? "reward" : "cost");
        telemetry.environmentTick(performance.now());
        for (const note of result.notes) addLog(["PADDLE_HIT", "DELIVERED", "HIT"].includes(note) ? "feedback" : "input", `[${note}]`);
        renderMetrics();
        ui.step.value = String(state.model.tick).padStart(6, "0");
        ui.step.textContent = ui.step.value;
        state.nextStep = nextWorldStepDeadline(state.nextStep, performance.now(), state.speed);
      } else if (data.action) {
        if (state.queuedAction !== null) {
          state.lateActions += 1;
          ui.lateActions.value = String(state.lateActions);
          ui.lateActions.textContent = ui.lateActions.value;
        }
        state.queuedAction = data.action;
      }
      ui.status.textContent = state.running ? "RUNNING" : "PAUSED";
      ui.runtimeQueue.value = `待处理 ${state.pendingSteps}`; ui.runtimeQueue.textContent = ui.runtimeQueue.value;
      telemetry.updateReasoner(data.reasoner);
      render();
      return;
    }
    if (data.type === "fault") {
      signalFeedback(ui.runtime, "error");
      state.pending = false;
      state.running = false;
      ui.runtime.classList.add("fault");
      ui.runtimeLabel.textContent = "推理异常";
      ui.status.textContent = "FAULT";
      addLog("fault", data.message ?? "Unknown reasoner error");
    }
  });

  state.worker.addEventListener("error", (event) => {
    if (generation !== state.generation) return;
    state.running = false;
    state.pending = false;
    ui.runtime.classList.add("fault");
    ui.runtimeLabel.textContent = "Worker 异常";
    addLog("fault", event.message || "NARS Worker stopped");
  });
  state.worker.postMessage({ type: "init", game: gameId, seed: state.seed, actions: definition.actions, priorRules: definition.narsPriorRules ?? [] });
}

function requestStep(): void {
  if (!state.worker || !state.ready || state.pending) { state.waitingForWorker = true; return; }
  state.waitingForWorker = false;
  const rawInput = buildNarsStep(state.model);
  const input = perceptionCadence?.select(state.model.tick + 1, rawInput) ?? rawInput;
  state.pending = true;
  state.pendingSteps += 1;
  // Track the world state sent to NARS. Async mode may advance while this
  // request is pending, but must not resend the same state on every animation frame.
  state.requestTick = state.model.tick;
  ui.runtimeQueue.value = `待处理 ${state.pendingSteps}`; ui.runtimeQueue.textContent = ui.runtimeQueue.value;
  ui.status.textContent = "INFERENCE";
  state.worker.postMessage({ type: "step", game: gameId, step: state.model.tick + 1, ...input, cycles: state.cycles, babble: state.babble });
}

function metric(label: string, value: string | number): void {
  const box = document.createElement("div"); box.className = "metric";
  const name = document.createElement("span"); name.textContent = label;
  const result = document.createElement("strong"); result.textContent = String(value);
  box.append(name, result); ui.metrics.append(box);
}

function sensor(text: string, active = false): void {
  const item = document.createElement("span"); item.className = `sensor-pill${active ? " active" : ""}`; item.textContent = text; ui.sensors.append(item);
}

function renderMetrics(): void {
  ui.metrics.replaceChildren(); ui.sensors.replaceChildren();
  switch (state.model.game) {
    case "pong":
      ui.scoreLabel.value = "HITS / MISSES"; metric("击球", state.model.hits); metric("漏球", state.model.misses); metric("周期", state.model.tick);
      sensor(`ball ${Math.round(state.model.ballX)}`, true); sensor(`bat ${Math.round(state.model.paddleX)}`); sensor(`y ${Math.round(state.model.ballY)}`); break;
    case "alien":
      ui.scoreLabel.value = "SHOTS / HITS"; metric("射击", state.model.shots); metric("命中", state.model.hits); metric("命中率", state.model.shots ? `${Math.round(100 * state.model.hits / state.model.shots)}%` : "—");
      sensor(state.model.defenderX < state.model.alienX ? "r0" : "l0", true); sensor(`alien ${state.model.alienX.toFixed(2)}`); break;
    case "bandrobot":
      ui.scoreLabel.value = "PICK / DELIVERY"; metric("位置", state.model.position); metric("状态", state.model.picked ? "持物" : "空手"); metric("完成", state.model.successes);
      sensor(`pos ${state.model.position}`, true); sensor(`target ${state.model.picked ? state.model.goal : state.model.target}`); sensor(state.model.picked ? "picked" : "empty"); break;
    case "cartpole":
      ui.scoreLabel.value = "BALANCE / ANGLE"; metric("平衡步", state.model.successes); metric("失败步", state.model.failures); metric("角度", `${Math.round(state.model.angle * 180 / Math.PI)}°`);
      sensor(`state ${Math.round((state.model.angle + Math.PI) / (Math.PI * 2) * 8)}`, true); sensor(`ω ${state.model.angleVelocity.toFixed(2)}`); break;
    case "hunt":
      ui.scoreLabel.value = "PURSUIT / CAPTURE"; metric("捕获", state.model.hits); metric("目标间距", Math.abs(state.model.ball.x - state.model.player.x) + Math.abs(state.model.ball.y - state.model.player.y)); metric("场地", `${state.model.width}×${state.model.height}`);
      sensor(state.model.ball.x < state.model.player.x ? "ball_left" : "ball_right", true); sensor(state.model.ball.y < state.model.player.y ? "ball_up" : "ball_down", true); break;
    case "tictactoe":
      ui.scoreLabel.value = "BOARD / RESULT"; metric("回合", state.model.turn.toUpperCase()); metric("步数", state.model.moves); metric("结果", state.model.winner?.toUpperCase() ?? "—"); state.model.board.forEach((cell, index) => sensor(`c${index}:${cell ?? "·"}`, Boolean(cell))); break;
    case "shot":
      ui.scoreLabel.value = "SHOT / HIT"; metric("射击", state.model.shots); metric("命中", state.model.hits); metric("命中率", state.model.shots ? `${Math.round(100 * state.model.hits / state.model.shots)}%` : "—"); sensor(state.model.targetX < state.model.playerX ? "target_left" : "target_right", true); break;
    case "testchamber":
      ui.scoreLabel.value = "GRID / DELIVERY"; metric("位置", `${state.model.player.x},${state.model.player.y}`); metric("携带", state.model.carrying ? "是" : "否"); metric("送达", state.model.delivered); sensor(state.model.switch.active ? "switch_on" : "switch_off", true); sensor(state.model.item.active ? "item" : "empty"); break;
    case "fighterplane":
      ui.scoreLabel.value = "AIR / HIT"; metric("命中", state.model.hits); metric("生命", state.model.player.hp); metric("冷却", state.model.cooldown); sensor(state.model.enemy.x < state.model.player.x ? "enemy_left" : "enemy_right", true); sensor(`hp_${state.model.enemy.hp}`); break;
    case "echo-relay":
      ui.scoreLabel.value = "ECHO / NAVIGATION"; metric("能量", `${state.model.playerEnergy} / 36`); metric("脉冲", `${state.model.pulseEnergy} / 6`); metric("发现", state.model.discoveries); metric("碰撞", state.model.collisions);
      sensor(`face_${state.model.facing}`, true); sensor(`known_walls_${state.model.knownWalls.length}`); sensor(state.model.arrived ? "beacon_reached" : "signal_at_beacon");
      ui.echoMapDetails.hidden = false;
      break;
  }
  ui.sensorSummary.value = `${ui.sensors.childElementCount} inputs`;
}

function drawPong(context: CanvasRenderingContext2D, model: PongState): void {
  context.fillStyle = "#202720"; context.fillRect(0, 0, 800, 600);
  context.strokeStyle = "#596558"; context.setLineDash([10, 12]); context.beginPath(); context.moveTo(400, 0); context.lineTo(400, 600); context.stroke(); context.setLineDash([]);
  context.strokeStyle = "rgba(184,205,168,.45)"; context.beginPath(); context.moveTo(0, 8); context.lineTo(800, 8); context.stroke();
  context.fillStyle = "#b5e567"; context.fillRect(model.paddleX - 28, 0, 56, 12);
  context.fillStyle = "#ffc56c"; context.beginPath(); context.arc(model.ballX, model.ballY, 9, 0, Math.PI * 2); context.fill();
}

function drawAlien(context: CanvasRenderingContext2D, model: AlienState): void {
  context.fillStyle = "#242c27"; context.fillRect(0, 0, 800, 600); context.strokeStyle = "rgba(191,207,177,.12)";
  for (let y = 60; y < 600; y += 60) { context.beginPath(); context.moveTo(0, y); context.lineTo(800, y); context.stroke(); }
  context.fillStyle = "#ff7661"; context.fillRect(model.alienX * 800 - 24, 125, 48, 20);
  context.fillStyle = "#b5e567"; context.fillRect(model.defenderX * 800 - 32, 548, 64, 14);
}

function drawBandRobot(context: CanvasRenderingContext2D, model: BandRobotState): void {
  context.fillStyle = "#2b3028"; context.fillRect(0, 0, 800, 600); context.strokeStyle = "#929985"; context.lineWidth = 3; context.beginPath(); context.moveTo(45, 465); context.lineTo(755, 465); context.stroke();
  for (let i = 0; i <= 20; i += 1) { const x = 45 + i * 35.5; context.strokeStyle = i === model.target ? "#ffc56c" : i === model.goal ? "#71d9c8" : "#697265"; context.beginPath(); context.moveTo(x, 452); context.lineTo(x, 478); context.stroke(); }
  context.fillStyle = "#f7bd64"; context.beginPath(); context.arc(45 + model.target * 35.5, 430, 11, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#b5e567"; context.beginPath(); context.moveTo(45 + model.goal * 35.5, 492); context.lineTo(32 + model.goal * 35.5, 517); context.lineTo(58 + model.goal * 35.5, 517); context.closePath(); context.fill();
  const x = 45 + model.position * 35.5; context.fillStyle = "#71d9c8"; context.fillRect(x - 17, 390, 34, 54); context.fillRect(x - 28, 400, 11, 8); context.fillRect(x + 17, 400, 11, 8);
  if (model.picked) { context.fillStyle = "#ffc56c"; context.beginPath(); context.arc(x, 380, 9, 0, Math.PI * 2); context.fill(); }
}

function drawCartpole(context: CanvasRenderingContext2D, model: CartPoleState): void {
  context.fillStyle = "#283129"; context.fillRect(0, 0, 800, 600); const x = 90 + model.position * 620, y = 420;
  context.strokeStyle = "#e4e6dc"; context.lineWidth = 11; context.beginPath(); context.moveTo(x, y); context.lineTo(x + Math.sin(model.angle) * 190, y - Math.cos(model.angle) * 190); context.stroke();
  context.fillStyle = "#b5e567"; context.fillRect(x - 38, y, 76, 35); context.fillStyle = "#f7bd64"; context.beginPath(); context.arc(x + Math.sin(model.angle) * 190, y - Math.cos(model.angle) * 190, 13, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "#70796d"; context.lineWidth = 3; context.beginPath(); context.moveTo(45, 458); context.lineTo(755, 458); context.stroke();
}

function drawHunt(context: CanvasRenderingContext2D, model: HuntState): void {
  context.fillStyle = "#222921"; context.fillRect(0, 0, 800, 600); const cellWidth = 800 / model.width, cellHeight = 600 / model.height;
  context.strokeStyle = "rgba(185,200,174,.12)"; context.lineWidth = 1;
  for (let x = 0; x <= model.width; x += 1) { context.beginPath(); context.moveTo(x * cellWidth, 0); context.lineTo(x * cellWidth, 600); context.stroke(); }
  for (let y = 0; y <= model.height; y += 1) { context.beginPath(); context.moveTo(0, y * cellHeight); context.lineTo(800, y * cellHeight); context.stroke(); }
  context.fillStyle = "#ffc56c"; context.beginPath(); context.arc((model.ball.x + .5) * cellWidth, (model.ball.y + .5) * cellHeight, Math.min(cellWidth, cellHeight) * .3, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#b5e567"; context.fillRect((model.player.x + .18) * cellWidth, (model.player.y + .18) * cellHeight, cellWidth * .64, cellHeight * .64);
}

function drawExpansion(context: CanvasRenderingContext2D, model: ExpansionState): void {
  context.fillStyle = "#202720"; context.fillRect(0, 0, 800, 600);
  if (model.game === "tictactoe") {
    const left = 80, top = 70, boardWidth = 640, boardHeight = 460, cellWidth = boardWidth / 3, cellHeight = boardHeight / 3;
    context.strokeStyle = "#84927f"; context.lineWidth = 4;
    for (let i = 1; i < 3; i += 1) {
      context.beginPath(); context.moveTo(left + i * cellWidth, top); context.lineTo(left + i * cellWidth, top + boardHeight); context.stroke();
      context.beginPath(); context.moveTo(left, top + i * cellHeight); context.lineTo(left + boardWidth, top + i * cellHeight); context.stroke();
    }
    context.font = "bold 110px system-ui"; context.textAlign = "center"; context.textBaseline = "middle";
    model.board.forEach((cell, index) => {
      if (!cell) return;
      const column = index % 3, row = Math.floor(index / 3);
      context.fillStyle = cell === "x" ? "#b5e567" : "#ffc56c";
      context.fillText(cell.toUpperCase(), left + (column + 0.5) * cellWidth, top + (row + 0.5) * cellHeight);
    });
    return;
  }
  if (model.game === "shot") { context.fillStyle = "#ffc56c"; context.beginPath(); context.arc(model.targetX * 800, (1 - model.targetY) * 600, 22, 0, Math.PI * 2); context.fill(); context.fillStyle = "#b5e567"; context.fillRect(model.playerX * 800 - 30, 540, 60, 18); return; }
  if (model.game === "testchamber") { const cw = 800 / model.width, ch = 600 / model.height; context.strokeStyle = "rgba(185,200,174,.18)"; for (let x = 0; x <= model.width; x++) { context.beginPath(); context.moveTo(x * cw, 0); context.lineTo(x * cw, 600); context.stroke(); } for (let y = 0; y <= model.height; y++) { context.beginPath(); context.moveTo(0, y * ch); context.lineTo(800, y * ch); context.stroke(); } context.fillStyle = "#ffc56c"; context.fillRect(model.item.x * cw + 10, model.item.y * ch + 10, cw - 20, ch - 20); context.fillStyle = model.switch.active ? "#71d9c8" : "#ff7661"; context.fillRect(model.switch.x * cw + 10, model.switch.y * ch + 10, cw - 20, ch - 20); context.fillStyle = "#b5e567"; context.fillRect(model.player.x * cw + 12, model.player.y * ch + 12, cw - 24, ch - 24); return; }
  if (model.game !== "fighterplane") return;
  context.fillStyle = "#ff7661"; context.beginPath(); context.arc(model.enemy.x / model.width * 800, model.enemy.y / model.height * 600, 24, 0, Math.PI * 2); context.fill(); context.fillStyle = "#b5e567"; context.beginPath(); context.moveTo(model.player.x / model.width * 800, model.player.y / model.height * 600 - 28); context.lineTo(model.player.x / model.width * 800 - 22, model.player.y / model.height * 600 + 22); context.lineTo(model.player.x / model.width * 800 + 22, model.player.y / model.height * 600 + 22); context.closePath(); context.fill();
}

function drawEchoMap(context: CanvasRenderingContext2D, model: EchoRelayState, revealTruth: boolean): void {
  const cell = Math.min(800 / model.width, 600 / model.height);
  const offsetX = (800 - cell * model.width) / 2, offsetY = (600 - cell * model.height) / 2;
  context.fillStyle = "#18211d"; context.fillRect(0, 0, 800, 600);
  const known = new Set(model.knownWalls);
  for (let y = 0; y < model.height; y += 1) for (let x = 0; x < model.width; x += 1) {
    const wall = revealTruth ? model.walls[y * model.width + x] : known.has(`${x}_${y}`);
    context.fillStyle = wall ? "#65736b" : "#27332d";
    context.fillRect(offsetX + x * cell + 2, offsetY + y * cell + 2, cell - 4, cell - 4);
    if (!revealTruth && !wall) { context.fillStyle = "rgba(198,214,183,.16)"; context.beginPath(); context.arc(offsetX + (x + .5) * cell, offsetY + (y + .5) * cell, 2, 0, Math.PI * 2); context.fill(); }
  }
  context.fillStyle = "#ffc56c"; context.beginPath(); context.arc(offsetX + (model.beacon.x + .5) * cell, offsetY + (model.beacon.y + .5) * cell, cell * .22, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#b5e567"; context.beginPath(); context.arc(offsetX + (model.player.x + .5) * cell, offsetY + (model.player.y + .5) * cell, cell * .26, 0, Math.PI * 2); context.fill();
  if (!revealTruth && model.pulse) { context.strokeStyle = "#71d9c8"; context.lineWidth = 4; context.beginPath(); for (const [index, point] of model.pulse.path.entries()) { const x = offsetX + (point.x + .5) * cell, y = offsetY + (point.y + .5) * cell; index === 0 ? context.moveTo(x, y) : context.lineTo(x, y); } context.stroke(); }
}

function paintMapCanvas(canvas: HTMLCanvasElement, model: EchoRelayState, revealTruth: boolean): void {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width * (window.devicePixelRatio || 1)));
  const height = Math.max(1, Math.round(bounds.height * (window.devicePixelRatio || 1)));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const mapContext = canvas.getContext("2d");
  if (!mapContext) return;
  mapContext.setTransform(width / 800, 0, 0, height / 600, 0, 0);
  drawEchoMap(mapContext, model, revealTruth);
}

function render(): void {
  const rect = ui.canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * ratio)), height = Math.max(1, Math.round(rect.height * ratio));
  if (ui.canvas.width !== width || ui.canvas.height !== height) { ui.canvas.width = width; ui.canvas.height = height; }
  context.setTransform(width / 800, 0, 0, height / 600, 0, 0);
  switch (state.model.game) {
    case "pong": drawPong(context, state.model); break;
    case "alien": drawAlien(context, state.model); break;
    case "bandrobot": drawBandRobot(context, state.model); break;
    case "cartpole": drawCartpole(context, state.model); break;
    case "hunt": drawHunt(context, state.model); break;
    case "tictactoe": case "shot": case "testchamber": case "fighterplane": drawExpansion(context, state.model); break;
    case "echo-relay": drawEchoMap(context, state.model, false); if (ui.echoMapDetails.open) { paintMapCanvas(ui.echoTruthMap, state.model, true); paintMapCanvas(ui.echoKnownMap, state.model, false); } break;
  }
}

function addManualControls(): void {
  const actionsByGame = {
    pong: [["左移", "left"], ["右移", "right"]],
    alien: [["左移", "left"], ["右移", "right"], ["射击", "shoot"]],
    bandrobot: [["左移", "left"], ["右移", "right"], ["拾取", "pick"], ["放下", "drop"]],
    cartpole: [["向左推", "left"], ["向右推", "right"]],
    hunt: [["左", "left"], ["右", "right"], ["上", "up"], ["下", "down"]],
    tictactoe: Array.from({ length: 9 }, (_, index) => [`格 ${index + 1}`, `cell${index}`]),
    shot: [["左移", "left"], ["右移", "right"], ["射击", "shoot"]],
    testchamber: [["左", "left"], ["右", "right"], ["上", "up"], ["下", "down"], ["拾取", "pick"], ["开关", "activate"], ["放下", "drop"]],
    fighterplane: [["左", "left"], ["右", "right"], ["上", "up"], ["下", "down"], ["开火", "fire"]],
    "echo-relay": [["前进", "move"], ["左转", "turn_left"], ["右转", "turn_right"], ["探测", "ping"]],
  } satisfies Record<DemoId, ManualAction[]>;
  const controls = actionsByGame[gameId];
  for (const [label, action] of controls) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.title = label;
    button.setAttribute("aria-label", label);
    const icon = document.createElement("i");
    icon.dataset.lucide = ACTION_ICONS[action] ?? "activity";
    button.append(icon, document.createTextNode(label));
    mountIcons(button);
    button.addEventListener("click", () => { if (applyManualGameControl(state.model, action)) { addLog("system", `[MANUAL] ${action} · 环境输入`); renderMetrics(); render(); } });
    ui.manual.append(button);
  }
}

function setRunning(running: boolean): void {
  state.running = running;
  setIcon(ui.runIcon, running ? "pause" : "play");
  ui.runLabel.textContent = running ? "暂停" : "继续";
  ui.run.setAttribute("aria-label", running ? "暂停" : "继续");
  ui.run.title = running ? "暂停" : "继续";
  ui.status.textContent = state.pending ? "INFERENCE" : running ? "RUNNING" : "PAUSED";
  state.nextStep = performance.now();
}
function reset(seed = state.seed): void {
  state.seed = Number(seed) >>> 0 || 1;
  state.model = createDemoState(gameId, state.seed);
  perceptionCadence?.reset();
  state.running = true;
  state.pending = false;
  state.pendingSteps = 0;
  state.queuedAction = null;
  state.ready = false;
  state.waitingForWorker = true;
  telemetry.resetRates();
  ui.log.replaceChildren();
  ui.step.value = "000000";
  ui.step.textContent = "000000";
  ui.operation.value = "等待第一步";
  ui.source.value = "WAITING";
  ui.runtimeQueue.value = "待处理 0";
  ui.runtimeQueue.textContent = ui.runtimeQueue.value;
  renderMetrics();
  initializeWorker();
  setRunning(true);
  render();
}

function setSourceDisclosure(): void {
  const reference = document.createElement("span"); reference.textContent = `环境机制参考 ${definition.source}；许可：${definition.license}。`;
  const priorNote = definition.narsPriorNote;
  const link = document.createElement("a"); link.href = definition.url; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = "查看源码";
  ui.sourceCopy.append(reference, document.createTextNode(" "), link);
  if (priorNote) { const disclosure = document.createElement("span"); disclosure.className = "prior-rule-note"; disclosure.textContent = priorNote; ui.sourceCopy.append(document.createElement("br"), disclosure); }
  if (definition.perceptionCadence) {
    const cadenceNote = document.createElement("span");
    cadenceNote.className = "prior-rule-note";
    cadenceNote.textContent = "前 5 刻完整输入；此后感知或目标变化立即输入，稳定状态每 5 刻刷新；结果反馈每次都保留。";
    ui.sourceCopy.append(document.createElement("br"), cadenceNote);
  }
  ui.sourceToggle.addEventListener("click", () => { const open = ui.sourceToggle.getAttribute("aria-expanded") === "true"; ui.sourceToggle.setAttribute("aria-expanded", String(!open)); ui.sourceCopy.hidden = open; });
}

function addTabsAndControls(): void {
  for (const button of ui.filters) button.addEventListener("click", () => {
    state.filter = button.dataset.filter ?? "all";
    for (const tab of ui.filters) tab.setAttribute("aria-selected", String(tab === button));
    for (const row of ui.log.children) (row as HTMLElement).hidden = state.filter !== "all" && (row as HTMLElement).dataset.kind !== state.filter;
  });
  ui.clearLog.addEventListener("click", () => ui.log.replaceChildren());
  ui.cycles.value = String(state.cycles); ui.cyclesLabel.value = String(state.cycles);
  ui.cycles.addEventListener("input", () => { state.cycles = Number(ui.cycles.value); ui.cyclesLabel.value = String(state.cycles); telemetry.setCyclesPerTick(state.cycles); });
  ui.babble.value = String(Math.round(state.babble * 100)); ui.babbleLabel.value = `${Math.round(state.babble * 100)}%`;
  ui.babble.addEventListener("input", () => { state.babble = Number(ui.babble.value) / 100; ui.babbleLabel.value = `${ui.babble.value}%`; });
  ui.speed.value = String(state.speed); ui.speedLabel.value = `${state.speed} 步/秒`;
  telemetry.setTargetTps(state.speed);
  telemetry.setCyclesPerTick(state.cycles);
  ui.speed.addEventListener("input", () => { state.speed = Number(ui.speed.value); ui.speedLabel.value = `${state.speed} TPS`; telemetry.setTargetTps(state.speed); });
  ui.toggleRateHud.addEventListener("click", () => { const hidden = ui.rateHud.classList.toggle("is-hidden"); ui.toggleRateHud.setAttribute("aria-label", hidden ? "显示速率 HUD" : "隐藏速率 HUD"); ui.toggleRateHud.title = hidden ? "显示速率 HUD" : "隐藏速率 HUD"; });
  ui.modeSync.addEventListener("change", () => setRuntimeMode("sync"));
  ui.modeAsync.addEventListener("change", () => setRuntimeMode("async"));
  ui.echoMapDetails.addEventListener("toggle", () => { if (ui.echoMapDetails.open && state.model.game === "echo-relay") render(); });
  ui.run.addEventListener("click", () => setRunning(!state.running));
  ui.singleStep.addEventListener("click", () => { setRunning(false); requestStep(); });
  ui.reset.addEventListener("click", () => reset(state.seed));
  ui.newSeed.addEventListener("click", () => reset(randomSeed()));
}

function setRuntimeMode(mode: "sync" | "async"): void {
  state.mode = mode;
  ui.runtimeMode.value = mode === "sync" ? "同步" : "异步";
  ui.runtimeMode.textContent = ui.runtimeMode.value;
  ui.modeSync.checked = mode === "sync"; ui.modeAsync.checked = mode === "async";
  addLog("system", `运行节奏：${ui.runtimeMode.value}`);
}

function animationFrame(now: number): void {
  telemetry.frame(now);
  render();
  if (state.running && state.mode === "async" && now >= state.nextStep) {
    const result = advanceDemo(state.model, state.queuedAction);
    state.queuedAction = null;
    for (const note of result.notes) addLog(["PADDLE_HIT", "DELIVERED", "HIT"].includes(note) ? "feedback" : "input", `[${note}]`);
    telemetry.environmentTick(now);
    renderMetrics();
    ui.step.value = String(state.model.tick).padStart(6, "0");
    ui.step.textContent = ui.step.value;
    state.nextStep = now + 1000 / state.speed;
  }
  if (state.running && state.ready && !state.pending
    && (state.mode === "async" ? state.model.tick > state.requestTick : now >= state.nextStep)) requestStep();
  requestAnimationFrame(animationFrame);
}

function boot(): void {
  mountIcons();
  document.title = `${definition.title} · OpenNARS 3.0.4 Lab`;
  ui.title.textContent = definition.title; ui.subtitle.textContent = definition.subtitle; ui.family.textContent = `NARS 3.0.4 / ${gameId.toUpperCase()} MODEL`;
  setSourceDisclosure(); addManualControls(); addTabsAndControls(); setRuntimeMode("sync"); renderMetrics(); addLog("system", `模型已选中：${definition.title}`, 0); reset(state.seed); requestAnimationFrame(animationFrame);
  document.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement) return;
    if (state.model.game === "echo-relay") {
      const echoKeys: Record<string, string> = { w: "move", q: "turn_left", e: "turn_right", " ": "ping" };
      const action = echoKeys[event.key.toLowerCase()];
      if (action && applyManualGameControl(state.model, action)) { event.preventDefault(); renderMetrics(); render(); }
      return;
    }
    const keyMap: Record<string, string> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
    if (event.key === " ") { event.preventDefault(); setRunning(!state.running); }
    else if (keyMap[event.key] && applyManualGameControl(state.model, keyMap[event.key])) { event.preventDefault(); renderMetrics(); render(); }
  });
}

boot();
window.addEventListener("pagehide", () => telemetry.dispose(), { once: true });
