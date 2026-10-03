import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const args = Object.fromEntries(process.argv.slice(2).flatMap((argument, index, all) =>
  argument.startsWith("--") && all[index + 1] && !all[index + 1].startsWith("--")
    ? [[argument.slice(2), all[index + 1]]]
    : []));
const game = args.game ?? "microworld";
const seed = Number(args.seed ?? 3040304);
const mode = args.mode ?? "sync";
const knowledge = args.knowledge ?? null;
const targetTps = Number(args["target-tps"] ?? (game === "microworld" ? 20 : 5));
const cycles = Number(args.cycles ?? 10);
const babblePercent = args["babble-percent"] === undefined ? null : Number(args["babble-percent"]);
const durationMs = Number(args["duration-ms"] ?? 20000);
const output = resolve(args.output ?? `test-results/rate-${game}-${mode}.json`);
const baseUrl = args["base-url"] ?? "http://127.0.0.1:4321/opennars-304-ts-lab/";
const chromePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const coreRoot = resolve(projectRoot, "..", "OpenNARS-304-ts");

if (!Number.isSafeInteger(seed) || seed < 1 || seed > 0xffff_ffff
  || !["microworld", "pong", "alien", "bandrobot", "cartpole", "hunt", "tictactoe", "shot", "testchamber", "fighterplane", "echo-relay"].includes(game)
  || !["sync", "async"].includes(mode)
  || (knowledge !== null && !["starter", "classic"].includes(knowledge))
  || !(targetTps > 0) || !(cycles > 0) || !(durationMs >= 1000)
  || (babblePercent !== null && (!Number.isInteger(babblePercent) || babblePercent < 0 || babblePercent > 30))) {
  throw new Error("Invalid benchmark seed, mode, target TPS, cycles, or duration");
}

const gitHead = (directory) => execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const trackedSourceClean = (directory) => execFileSync("git", ["-C", directory, "status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" }).trim().length === 0;
const sortedPercentile = (values, fraction) => values.length === 0
  ? null
  : [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1];
const countActionSources = (events) => events.reduce((counts, event) => {
  counts[event.source] = (counts[event.source] ?? 0) + 1;
  return counts;
}, { NARS: 0, babble: 0, idle: 0 });
const pageKind = game === "microworld" ? "microworld" : "demo";
const url = new URL(pageKind === "microworld" ? "microworld.html" : `demo.html?game=${encodeURIComponent(game)}`, baseUrl);
url.searchParams.set("seed", String(seed));
if (game === "microworld" && knowledge !== null) url.searchParams.set("knowledge", knowledge);

mkdirSync(dirname(output), { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

try {
  await page.addInitScript(() => {
    window.__rateProbe = [];
    window.__rateFaults = [];
    window.__rateRequests = [];
    window.__rateMessages = {};
    const NativeWorker = window.Worker;
    window.Worker = new Proxy(NativeWorker, {
      construct(Target, workerArgs) {
        const worker = Reflect.construct(Target, workerArgs);
        const nativePostMessage = worker.postMessage.bind(worker);
        worker.postMessage = (message, transfer) => {
          if (message?.type === "step") window.__rateRequests.push({ atMs: performance.now(), step: message.step ?? null });
          return nativePostMessage(message, transfer);
        };
        worker.addEventListener("message", ({ data }) => {
          const kind = String(data?.type ?? "unknown");
          window.__rateMessages[kind] = (window.__rateMessages[kind] ?? 0) + 1;
          if (data?.type === "step-complete") window.__rateProbe.push({
            atMs: performance.now(),
            cycles: Number(data.cycles ?? 0),
            elapsedMs: Number(data.elapsedMs ?? 0),
            source: String(data.actionSource ?? data.source ?? "idle"),
            action: data.action ?? data.operator ?? null,
            concepts: Number(data.reasoner?.concepts ?? 0),
          });
          if (data?.type === "fault") window.__rateFaults.push(String(data.message ?? "Worker fault"));
        });
        return worker;
      },
    });
  });
  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  const ready = pageKind === "microworld" ? ".runtime-pill.ready" : "#game-runtime.ready";
  const stepSelector = pageKind === "microworld" ? "#step-count" : "#game-step";
  await page.locator(ready).waitFor({ timeout: 60000 });
  const controls = pageKind === "microworld"
    ? { speed: "#speed-input", cycles: "#nars-cycles", babble: "#nars-babble", mode: "#runtime-mode", reset: "#reset-run" }
    : { speed: "#speed", cycles: "#cycles-control", babble: "#babble-control", mode: mode === "sync" ? "#mode-sync" : "#mode-async", reset: "#reset-demo" };
  for (const [selector, value] of [[controls.speed, targetTps], [controls.cycles, cycles]]) {
    await page.locator(selector).evaluate((input, newValue) => {
      input.value = String(newValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  }
  if (babblePercent !== null) {
    await page.locator(controls.babble).evaluate((input, value) => {
      input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, babblePercent);
  }
  const effectiveTargetTps = Number(await page.locator(controls.speed).inputValue());
  const effectiveCycles = Number(await page.locator(controls.cycles).inputValue());
  if (effectiveTargetTps !== targetTps || effectiveCycles !== cycles) {
    throw new Error(`Requested controls were clamped: TPS ${targetTps} -> ${effectiveTargetTps}, cycles ${cycles} -> ${effectiveCycles}`);
  }
  if (pageKind === "microworld") {
    await page.locator(controls.mode).selectOption(mode);
  } else {
    await page.locator(controls.mode).check();
  }
  await page.locator(controls.reset).click();
  await page.locator(ready).waitFor({ timeout: 60000 });
  await page.waitForFunction((selector) => Number(document.querySelector(selector)?.textContent) > 0, stepSelector, { timeout: 60000 });
  const start = await page.evaluate((selector) => ({
    atMs: performance.now(),
    step: Number(document.querySelector(selector)?.textContent ?? 0),
    eventIndex: window.__rateProbe.length,
    requestIndex: window.__rateRequests.length,
  }), stepSelector);
  const samples = [start];
  let remainingMs = durationMs;
  while (remainingMs > 0) {
    const intervalMs = Math.min(5000, remainingMs);
    await page.waitForTimeout(intervalMs);
    samples.push(await page.evaluate((selector) => ({
      atMs: performance.now(),
      step: Number(document.querySelector(selector)?.textContent ?? 0),
      eventIndex: window.__rateProbe.length,
      concepts: window.__rateProbe.at(-1)?.concepts ?? null,
    }), stepSelector));
    remainingMs -= intervalMs;
  }
  const end = await page.evaluate((selector) => ({
    atMs: performance.now(),
    step: Number(document.querySelector(selector)?.textContent ?? 0),
    events: window.__rateProbe,
    requests: window.__rateRequests,
    messageCounts: window.__rateMessages,
    pending: document.querySelector("#runtime-queue")?.textContent ?? document.querySelector("#runtime-pending")?.textContent ?? null,
    hud: {
      fps: document.querySelector("#fps-hud")?.textContent,
      tps: document.querySelector("#tps-hud")?.textContent,
      rps: document.querySelector("#rps-hud")?.textContent,
    },
    pageHeapBytes: performance.memory?.usedJSHeapSize ?? null,
    workerFaults: window.__rateFaults,
  }), stepSelector);
  const events = end.events.slice(start.eventIndex);
  const elapsedSeconds = (end.atMs - start.atMs) / 1000;
  const completedCycles = events.reduce((sum, event) => sum + event.cycles, 0);
  const activeInferenceMs = events.reduce((sum, event) => sum + event.elapsedMs, 0);
  const windows = samples.slice(1).map((sample, index) => {
    const previous = samples[index];
    const windowEvents = end.events.slice(previous.eventIndex, sample.eventIndex);
    const seconds = (sample.atMs - previous.atMs) / 1000;
    return {
      elapsedSeconds: seconds,
      worldSteps: sample.step - previous.step,
      actualTps: (sample.step - previous.step) / seconds,
      wallRps: windowEvents.reduce((sum, event) => sum + event.cycles, 0) / seconds,
      p95InferenceMs: sortedPercentile(windowEvents.map((event) => event.elapsedMs), 0.95),
      concepts: sample.concepts,
      actionSources: countActionSources(windowEvents),
    };
  });
  const result = {
    schema: "opennars-304-ts-lab/browser-rate-benchmark/v1",
    coreCommit: gitHead(coreRoot),
    demoCommit: gitHead(projectRoot),
    coreTrackedSourceClean: trackedSourceClean(coreRoot),
    demoTrackedSourceClean: trackedSourceClean(projectRoot),
    browserVersion: browser.version(),
    nodeVersion: process.version,
    url: url.href,
    configuration: { game, seed, mode, knowledge, targetTps, cycles, babblePercent, durationMs },
    result: {
      elapsedSeconds,
      worldSteps: end.step - start.step,
      actualTps: (end.step - start.step) / elapsedSeconds,
      actualToTargetRatio: (end.step - start.step) / elapsedSeconds / targetTps,
      completedReasonerSteps: events.length,
      requestedReasonerSteps: end.requests.length - start.requestIndex,
      latestReasonerRequest: end.requests.at(-1) ?? null,
      workerMessageCounts: end.messageCounts,
      pendingAtEnd: end.pending,
      completedCycles,
      wallRps: completedCycles / elapsedSeconds,
      activeRps: activeInferenceMs > 0 ? completedCycles * 1000 / activeInferenceMs : null,
      p95InferenceMs: sortedPercentile(events.map((event) => event.elapsedMs), 0.95),
      firstConcepts: events[0]?.concepts ?? null,
      lastConcepts: events.at(-1)?.concepts ?? null,
      nonBabbleOperations: events.filter((event) => event.source === "NARS").length,
      narsOperations: events.filter((event) => event.source === "NARS")
        .map((event) => ({ atMs: Number(event.atMs.toFixed(2)), action: event.action })),
      actionSources: countActionSources(events),
      pageHeapBytes: end.pageHeapBytes,
      windows,
      hud: end.hud,
      pageErrors,
      consoleErrors,
      workerFaults: end.workerFaults,
    },
  };
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  if (pageErrors.length > 0 || consoleErrors.length > 0 || end.workerFaults.length > 0) process.exitCode = 1;
} finally {
  await browser.close();
}
