import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { advanceExpansion, buildExpansionNarsStep, createExpansionState, EXPANSION_DEFINITIONS } from "../src/games/expansion-models.ts";

const projectRoot = resolve(import.meta.dirname, "..");
const bundlePath = resolve(projectRoot, process.env.DEMO_WORKER_BUNDLE ?? "public/demo-worker.js");
const timeoutMs = Number(process.env.NARS_ACTION_TIMEOUT_MS ?? 15_000);
const seed = Number(process.env.NARS_ACTION_SEED ?? 3040304);
const cycles = Math.min(250, Math.max(1, Number(process.env.NARS_ACTION_CYCLES ?? 100)));
const executablePath = process.env.CHROME_PATH
  ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const bundle = await readFile(bundlePath);
const bundleInfo = await stat(bundlePath);
const bundleSha256 = createHash("sha256").update(bundle).digest("hex");
const ids = process.env.NARS_ACTION_GAME
  ? [process.env.NARS_ACTION_GAME]
  : Object.keys(EXPANSION_DEFINITIONS);
for (const id of ids) assert.ok(id in EXPANSION_DEFINITIONS, `Unknown expansion demo: ${id}`);

const server = createServer((request, response) => {
  if (request.url === "/demo-worker.js") {
    response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" });
    response.end(bundle);
  } else {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><meta charset=utf-8><title>OpenNARS action smoke</title>");
  }
});
let browser;
try {
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}/`);

  async function runWorkerStep({ game, seed, actions, priorRules, input, cycles, timeoutMs }) {
    return page.evaluate(async (parameters) => {
      const worker = new Worker("/demo-worker.js");
      const events = [];
      let readyResolve;
      let readyReject;
      let completeResolve;
      let completeReject;
      let watchdog;
      const ready = new Promise((resolveReady, rejectReady) => { readyResolve = resolveReady; readyReject = rejectReady; });
      const complete = new Promise((resolveComplete, rejectComplete) => { completeResolve = resolveComplete; completeReject = rejectComplete; });
      worker.addEventListener("error", (event) => {
        const error = new Error(event.message || "Demo Worker error");
        readyReject(error); completeReject(error);
      });
      worker.addEventListener("message", ({ data }) => {
        events.push(data);
        if (data?.type === "fault") {
          const error = new Error(data.message || "Demo Worker fault");
          readyReject(error); completeReject(error);
        } else if (data?.type === "ready") readyResolve(data);
        else if (data?.type === "step-complete") {
          clearTimeout(watchdog);
          completeResolve(data);
        }
      });
      worker.postMessage({ type: "init", game: parameters.game, seed: parameters.seed, actions: parameters.actions, priorRules: parameters.priorRules });
      let readyEvent;
      let stepEvent;
      const startedAt = performance.now();
      try {
        readyEvent = await Promise.race([
          ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Worker init timed out")), parameters.timeoutMs)),
        ]);
        worker.postMessage({
          type: "step", game: parameters.game, step: 1,
          beliefs: parameters.input.beliefs, goals: parameters.input.goals, feedback: parameters.input.feedback,
          cycles: parameters.cycles, babble: 0,
        });
        watchdog = setTimeout(() => completeReject(new Error("Worker inference timed out")), parameters.timeoutMs);
        stepEvent = await complete;
      } finally {
        clearTimeout(watchdog);
        worker.terminate();
      }
      return {
        ready: readyEvent,
        step: stepEvent,
        operationEvents: events.filter((event) => event?.type === "operation"),
        exeLogs: events.filter((event) => event?.type === "log" && event.kind === "EXE"),
        unexecutableLogs: events.filter((event) => event?.type === "log" && event.kind === "UNEXECUTABLE"),
        priorLogs: events.filter((event) => event?.type === "log" && event.kind === "PRIOR"),
        elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
        faults: events.filter((event) => event?.type === "fault"),
      };
    }, { game, seed, actions, priorRules, input, cycles, timeoutMs });
  }

  const results = [];
  for (const game of ids) {
    const definition = EXPANSION_DEFINITIONS[game];
    const state = createExpansionState(game, seed);
    const input = buildExpansionNarsStep(state);
    const result = await runWorkerStep({
      game, seed, actions: [...definition.actions], priorRules: [...definition.narsPriorRules], input, cycles, timeoutMs,
    });
    const action = result.step.action;
    const operation = result.operationEvents.find((event) => event.status === "executed" && event.action === action);
    const exe = result.exeLogs.find((event) => String(event.text).includes(String(action)));
    const validNarsExecution = result.step.source === "NARS"
      && typeof action === "string"
      && definition.actions.includes(action)
      && operation !== undefined
      && exe !== undefined;
    let environment = null;
    if (validNarsExecution) {
      const previousTick = state.tick;
      const observableBefore = JSON.stringify({ ...state, tick: 0 });
      const envResult = advanceExpansion(state, action);
      assert.equal(state.tick, previousTick + 1, `${game}: the NARS action must enter the environment transition`);
      const observableAfter = JSON.stringify({ ...state, tick: 0 });
      assert.notEqual(observableAfter, observableBefore, `${game}: the returned NARS action must change observable environment state`);
      environment = { tick: state.tick, changed: true, notes: envResult.notes, feedback: envResult.feedback, reward: envResult.reward };
    }
    results.push({
      game, priorNote: definition.narsPriorNote, priorRules: [...definition.narsPriorRules],
      input: { beliefs: input.beliefs, goals: input.goals, feedback: input.feedback },
      registeredActions: result.ready.actions, ready: result.ready.actions.includes(action),
      action, source: result.step.source, executed: operation !== undefined, exeText: exe?.text ?? null,
      triggered: validNarsExecution, cycles: result.step.cycles, narTime: result.step.narTime,
      elapsedMs: result.step.elapsedMs, browserRoundTripMs: result.elapsedMs,
      environment, unexecutableLogs: result.unexecutableLogs, priorLogs: result.priorLogs, faults: result.faults,
    });
  }
  assert.deepEqual(pageErrors, [], "browser page errors: " + pageErrors.join("; "));
  const summary = {
    ok: results.every((result) => result.triggered && result.environment?.changed),
    bundle: { path: bundlePath, bytes: bundleInfo.size, sha256: bundleSha256, modifiedUtc: bundleInfo.mtime.toISOString() },
    browser: browser.version(), configuration: { seed, babble: 0, cyclesPerStep: cycles },
    validity: "counted only when an actual Worker EXE and matching Operator.execute event agree with step-complete source=NARS; actual returned action is dispatched to its environment model",
    interpretationBoundary: "Each demo's production priorRules and live initial model input are used. Passing validates the installed causal rule, NARS operation execution, and environment dispatch; it does not establish that NARS learned the rule from sparse experience.",
    results,
  };
  console.log(JSON.stringify(summary, null, 2));
  assert.equal(summary.ok, true, "Every expansion demo must execute a prior-guided NARS action and advance its environment");
} finally {
  await browser?.close();
  if (server.listening) await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
}
