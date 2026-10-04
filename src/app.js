import {
  canNavigateHistory,
  formatCommandEcho,
  normalizeCommandLines,
  normalizeVolume,
  shouldSubmitFromKeydown,
} from "./input-behavior.js";
import { mountIcons } from "./ui/icons.ts";
import { mountExperienceTimeline } from "./ui/experience-timeline.ts";

const elements = {
  body: document.body,
  state: document.querySelector("#runtime-state"),
  activity: document.querySelector("#terminal-activity"),
  clock: document.querySelector("#cycle-clock"),
  output: document.querySelector("#terminal-output"),
  form: document.querySelector("#terminal-form"),
  input: document.querySelector("#terminal-input"),
  submit: document.querySelector(".send-button"),
  clear: document.querySelector("#clear-button"),
  interrupt: document.querySelector("#interrupt-button"),
  quickButtons: [...document.querySelectorAll("[data-command]")],
  coreVersion: document.querySelector("#core-version"),
  packageVersion: document.querySelector("#package-version"),
  sourceCommit: document.querySelector("#source-commit"),
  buildTime: document.querySelector("#build-time"),
  volume: document.querySelector("#volume-input"),
  volumeValue: document.querySelector("#volume-value"),
  configFile: document.querySelector("#config-file"),
  configStatus: document.querySelector("#config-status"),
  experiencePanel: document.querySelector("#experience-panel"),
  experienceList: document.querySelector("#experience-list"),
  experienceStatus: document.querySelector("#experience-status"),
  experienceMeta: document.querySelector("#experience-meta"),
};

const MAX_TERMINAL_LINES = 600;
const history = [];
let historyIndex = 0;
let worker = null;
let ready = false;
let busy = false;
let generation = 0;
let refocusAfterRun = false;
const experienceTimeline = mountExperienceTimeline({
  details: elements.experiencePanel,
  list: elements.experienceList,
  status: elements.experienceStatus,
  meta: elements.experienceMeta,
}, (open) => {
  if (worker !== null) worker.postMessage({ type: "experience-snapshot", open });
});

const INPUT_MAX_HEIGHT = 176;

function resizeInput() {
  elements.input.style.height = "0px";
  const height = Math.min(elements.input.scrollHeight, INPUT_MAX_HEIGHT);
  elements.input.style.height = `${height}px`;
  elements.input.style.overflowY = elements.input.scrollHeight > INPUT_MAX_HEIGHT ? "auto" : "hidden";
}

function focusInput() {
  if (!ready || busy || elements.input.disabled) return;
  requestAnimationFrame(() => {
    elements.input.focus({ preventScroll: true });
  });
}

function appendLine(text, channel = "system") {
  const line = document.createElement("div");
  line.className = `terminal-line ${channel.replace(/[^a-z-]/gi, "").toLowerCase() || "system"}`;
  line.textContent = String(text);
  elements.output.append(line);
  while (elements.output.childElementCount > MAX_TERMINAL_LINES) elements.output.firstElementChild.remove();
  elements.output.scrollTop = elements.output.scrollHeight;
}

function clearOutput() {
  elements.output.replaceChildren();
}

function setClock(value) {
  const normalized = String(value ?? "0");
  elements.clock.value = normalized.padStart(6, "0");
  elements.clock.textContent = elements.clock.value;
}

function updateControls() {
  const enabled = ready && !busy;
  elements.input.disabled = !enabled;
  elements.submit.disabled = !enabled;
  elements.volume.disabled = !enabled;
  for (const button of elements.quickButtons) button.disabled = !enabled;
  elements.body.classList.toggle("busy", busy);
  elements.activity.textContent = !ready ? "INITIALIZING" : busy ? "REASONING" : "READY";
  elements.state.textContent = !ready ? "BOOTING WORKER" : busy ? "INFERENCE ACTIVE" : "WORKER ONLINE";
}

function setVolumeDisplay(rawValue) {
  const volume = normalizeVolume(rawValue);
  if (volume === null) return;
  elements.volume.value = String(volume);
  elements.volumeValue.value = String(volume);
  elements.volumeValue.textContent = String(volume);
}

function formatBuildTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return String(iso);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function applyBuildMetadata(metadata) {
  if (!metadata) return;
  const coreVersion = String(metadata.coreVersion ?? "v3.0.4").replace(/^v/, "");
  elements.coreVersion.textContent = coreVersion;
  elements.packageVersion.textContent = metadata.packageVersion ?? "unknown";
  if (metadata.sourceCommit) {
    const shortCommit = metadata.sourceCommitShort ?? metadata.sourceCommit.slice(0, 8);
    elements.sourceCommit.textContent = shortCommit;
    elements.sourceCommit.href = `https://github.com/ARCJ137442/OpenNARS-304-ts/commit/${metadata.sourceCommit}`;
    elements.sourceCommit.title = metadata.sourceCommit;
  }
  if (metadata.builtAt) {
    elements.buildTime.textContent = formatBuildTime(metadata.builtAt);
    elements.buildTime.dateTime = metadata.builtAt;
    elements.buildTime.title = metadata.builtAt;
  }
}

async function loadBuildMetadata() {
  try {
    const response = await fetch("./build-meta.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    applyBuildMetadata(await response.json());
  } catch (error) {
    appendLine(`[metadata-error] ${error instanceof Error ? error.message : String(error)}`, "error");
  }
}

function stopWorker(reason = "session reset") {
  if (worker !== null) worker.terminate();
  worker = null;
  ready = false;
  busy = false;
  elements.body.classList.remove("ready", "busy", "failed");
  experienceTimeline.reset();
  updateControls();
  if (reason !== "initial boot") appendLine(`[session] ${reason}`, "system");
}

function startWorker(reason = "initial boot") {
  const currentGeneration = ++generation;
  stopWorker(reason);
  setClock(0);
  worker = new Worker("./nars-worker.js");

  worker.addEventListener("message", ({ data }) => {
    if (currentGeneration !== generation || !data) return;
    if (data.type === "ready") {
      ready = true;
      busy = false;
      elements.body.classList.add("ready");
      applyBuildMetadata(data.build);
      setClock(data.time);
      setVolumeDisplay(data.volume);
      experienceTimeline.reset();
      updateControls();
      elements.input.focus({ preventScroll: true });
      return;
    }
    if (data.type === "experience-reset") {
      experienceTimeline.reset();
      return;
    }
    if (data.type === "experience") {
      if (data.event) experienceTimeline.add(data.event);
      return;
    }
    if (data.type === "experience-snapshot") {
      for (const event of data.events ?? []) experienceTimeline.add(event);
      const stats = data.stats;
      if (stats) elements.experienceMeta.textContent = `窗口 ${stats.retained + stats.dropped} · 保留 ${stats.retained} · 丢弃 ${stats.dropped} · 仅收集真实事件`;
      return;
    }
    if (data.type === "output") {
      appendLine(data.text, data.channel);
      if (data.time !== undefined) setClock(data.time);
      return;
    }
    if (data.type === "busy") {
      const wasBusy = busy;
      busy = Boolean(data.busy);
      updateControls();
      if (wasBusy && !busy && refocusAfterRun) {
        refocusAfterRun = false;
        focusInput();
      }
      return;
    }
    if (data.type === "complete") {
      if (data.time !== undefined) setClock(data.time);
      if (data.volume !== undefined) setVolumeDisplay(data.volume);
      return;
    }
    if (data.type === "configured") {
      ready = true;
      busy = false;
      elements.configStatus.textContent = data.source ?? "CUSTOM CONFIG";
      setClock(data.time);
      setVolumeDisplay(data.volume);
      appendLine(`[runtime] ${data.source ?? "custom configuration"} loaded.`, "system");
      updateControls();
      focusInput();
      return;
    }
    if (data.type === "fatal") {
      ready = false;
      busy = false;
      elements.body.classList.add("failed");
      elements.state.textContent = "WORKER FAILED";
      elements.activity.textContent = "FAULT";
      appendLine(`[fatal] ${data.error}`, "error");
      updateControls();
    }
  });

  worker.addEventListener("error", (event) => {
    if (currentGeneration !== generation) return;
    ready = false;
    busy = false;
    elements.body.classList.add("failed");
    elements.state.textContent = "WORKER FAILED";
    elements.activity.textContent = "FAULT";
    appendLine(`[worker-error] ${event.message || "unknown worker error"}`, "error");
    updateControls();
  });
}

function submitCommand(rawCommand) {
  const lines = normalizeCommandLines(rawCommand);
  if (lines.length === 0 || !ready || busy || worker === null) return;
  if (lines.length === 1 && lines[0] === ":clear") {
    clearOutput();
    focusInput();
    return;
  }
  const command = lines.join("\n");
  appendLine(formatCommandEcho(lines), "input");
  if (history.at(-1) !== command) history.push(command);
  historyIndex = history.length;
  refocusAfterRun = true;
  worker.postMessage({ type: "command", lines });
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const command = elements.input.value;
  elements.input.value = "";
  resizeInput();
  submitCommand(command);
});

elements.input.addEventListener("keydown", (event) => {
  if (shouldSubmitFromKeydown(event)) {
    event.preventDefault();
    elements.form.requestSubmit();
  } else if (event.key === "ArrowUp" && history.length > 0 && canNavigateHistory(event.key, elements.input.value, elements.input.selectionStart, elements.input.selectionEnd)) {
    event.preventDefault();
    historyIndex = Math.max(0, historyIndex - 1);
    elements.input.value = history[historyIndex] ?? "";
    elements.input.setSelectionRange(elements.input.value.length, elements.input.value.length);
    resizeInput();
  } else if (event.key === "ArrowDown" && history.length > 0 && canNavigateHistory(event.key, elements.input.value, elements.input.selectionStart, elements.input.selectionEnd)) {
    event.preventDefault();
    historyIndex = Math.min(history.length, historyIndex + 1);
    elements.input.value = historyIndex === history.length ? "" : history[historyIndex];
    elements.input.setSelectionRange(elements.input.value.length, elements.input.value.length);
    resizeInput();
  } else if (event.key === "Escape") {
    elements.input.value = "";
    resizeInput();
  }
});

elements.input.addEventListener("input", resizeInput);

elements.volume.addEventListener("input", () => setVolumeDisplay(elements.volume.value));
elements.volume.addEventListener("change", () => {
  const volume = normalizeVolume(elements.volume.value);
  if (volume !== null) submitCommand(`:volume ${volume}`);
});

elements.configFile.addEventListener("change", async () => {
  const file = elements.configFile.files?.[0];
  if (!file || !ready || busy || worker === null) return;
  try {
    const text = await file.text();
    if (!text.trimStart().startsWith("<")) throw new Error("configuration must be XML text");
    busy = true;
    updateControls();
    worker.postMessage({ type: "config", text, name: file.name });
  } catch (error) {
    elements.configStatus.textContent = "CONFIG ERROR";
    appendLine(`[config-error] ${error instanceof Error ? error.message : String(error)}`, "error");
  } finally {
    elements.configFile.value = "";
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
    event.preventDefault();
    clearOutput();
  }
  if (event.ctrlKey && event.key.toLowerCase() === "c" && busy) {
    event.preventDefault();
    startWorker("推理已中断");
  }
});

elements.clear.addEventListener("click", clearOutput);
elements.interrupt.addEventListener("click", () => startWorker(busy ? "推理已中断" : "会话已重置"));

for (const button of elements.quickButtons) {
  button.addEventListener("click", () => submitCommand(button.dataset.command));
}

mountIcons();
updateControls();
resizeInput();
await loadBuildMetadata();
startWorker();
window.addEventListener("pagehide", () => experienceTimeline.dispose(), { once: true });
