#!/usr/bin/env node
// Run the built browser Worker and the same TypeScript world model in Node.
// This isolates inference from canvas/scheduling while preserving the inputs.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_DEFINITIONS, advanceDemo, buildNarsStep, createDemoState } from "../src/games/models.ts";
import { PerceptionCadence } from "../src/games/perception-cadence.ts";

const args = Object.fromEntries(process.argv.slice(2).flatMap((argument, index, all) =>
  argument.startsWith("--") && all[index + 1] && !all[index + 1].startsWith("--")
    ? [[argument.slice(2), all[index + 1]]]
    : []));
const game = args.game ?? "cartpole";
const definition = DEMO_DEFINITIONS[game];
const seed = Number(args.seed ?? 3040304);
const ticks = Number(args.ticks ?? 67);
const cycles = Number(args.cycles ?? 5);
const babble = args.babble === undefined ? null : Number(args.babble);
const suppressFeedback = args["suppress-feedback"] === "true";
const reportEvery = Number(args["report-every"] ?? 10);
const requestedRefresh = args["refresh-every"] === undefined ? null : Number(args["refresh-every"]);
const refreshEvery = requestedRefresh === 0 ? null : requestedRefresh ?? definition?.perceptionCadence?.refreshEvery ?? null;
const warmupTicks = Number(args["warmup-ticks"] ?? definition?.perceptionCadence?.warmupTicks ?? 0);
const output = resolve(args.output ?? "test-results/profile-demo-worker.json");
const extraPriorRules = args["prior-rules-file"]
  ? JSON.parse(readFileSync(resolve(args["prior-rules-file"]), "utf8"))
  : [];
if (!definition || !Number.isSafeInteger(seed) || !Number.isSafeInteger(ticks) || !Number.isSafeInteger(cycles)
  || !Number.isSafeInteger(reportEvery) || seed < 1 || ticks < 1 || cycles < 1 || reportEvery < 1
  || (refreshEvery !== null && (!Number.isSafeInteger(refreshEvery) || refreshEvery < 1))
  || !Number.isSafeInteger(warmupTicks) || warmupTicks < 0
  || !Array.isArray(extraPriorRules) || !extraPriorRules.every((rule) => typeof rule === "string")
  || (babble !== null && (!Number.isFinite(babble) || babble < 0 || babble > 0.5))) {
  throw new Error("Invalid game, seed, ticks, cycles, or report interval");
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gitHead = (directory) => execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const messages = [];
let receiveMessage;
globalThis.self = {
  addEventListener(type, listener) {
    if (type === "message") receiveMessage = listener;
  },
  postMessage(message) { messages.push(message); },
};
await import("../public/demo-worker.js");
if (typeof receiveMessage !== "function") throw new Error("Built Worker did not register a message listener");
const send = (data) => receiveMessage({ data });
const state = createDemoState(game, seed);
send({ type: "init", game, seed, actions: definition.actions,
  priorRules: [...definition.narsPriorRules ?? [], ...extraPriorRules] });
if (messages.some((message) => message.type === "fault")) throw new Error("Worker initialization fault");

const segments = [];
let elapsed = [];
let lastConcepts = 0;
let peakRssBytes = process.memoryUsage().rss;
const actionSources = { NARS: 0, babble: 0, idle: 0 };
let firstNarsOperation = null;
const narsOperations = [];
const observableWorld = ({ tick, reward, pendingFeedback, ...physical }) => JSON.stringify(physical);
const cadence = refreshEvery === null ? null : new PerceptionCadence(warmupTicks, refreshEvery);
let submittedBeliefs = 0;
let submittedGoals = 0;
for (let tick = 1; tick <= ticks; tick += 1) {
  const rawInput = buildNarsStep(state);
  const input = cadence?.select(tick, rawInput) ?? rawInput;
  submittedBeliefs += input.beliefs.length;
  submittedGoals += input.goals.length;
  const start = performance.now();
  send({ type: "step", game, step: state.tick + 1, ...input,
    feedback: suppressFeedback ? [] : input.feedback,
    cycles, babble: babble ?? definition.babble });
  const response = messages.findLast((message) => message.type === "step-complete" || message.type === "fault");
  if (response?.type !== "step-complete") throw new Error(`Worker fault at tick ${tick}: ${response?.message ?? "missing response"}`);
  elapsed.push(performance.now() - start);
  lastConcepts = Number(response.reasoner?.concepts ?? 0);
  const source = response.source === "NARS" || response.source === "babble" ? response.source : "idle";
  actionSources[source] += 1;
  const withoutAction = source === "NARS" ? structuredClone(state) : null;
  if (withoutAction !== null) advanceDemo(withoutAction, null);
  const transition = advanceDemo(state, response.action ?? null);
  if (withoutAction !== null) {
    const operation = {
      tick, action: response.action,
      worldChanged: observableWorld(state) !== observableWorld(withoutAction),
      reward: transition.reward,
      notes: transition.notes,
    };
    narsOperations.push(operation);
    firstNarsOperation ??= operation;
  }
  peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
  if (tick % reportEvery === 0 || tick === ticks) {
    const durationMs = elapsed.reduce((sum, value) => sum + value, 0);
    segments.push({
      endTick: tick,
      ticks: elapsed.length,
      tps: Number((elapsed.length * 1000 / durationMs).toFixed(3)),
      p95Ms: Number([...elapsed].sort((a, b) => a - b)[Math.ceil(elapsed.length * 0.95) - 1].toFixed(2)),
      concepts: lastConcepts,
      rssBytes: process.memoryUsage().rss,
    });
    elapsed = [];
  }
  messages.length = 0;
}
const result = {
  schema: "opennars-304-ts-lab/profile-demo-worker/v1",
  coreCommit: gitHead(resolve(projectRoot, "..", "OpenNARS-304-ts")),
  demoCommit: gitHead(projectRoot),
  nodeVersion: process.version,
  configuration: { game, seed, ticks, cycles, babble: babble ?? definition.babble,
    suppressFeedback, refreshEvery, warmupTicks, reportEvery, extraPriorRules },
  segments,
  finalConcepts: lastConcepts,
  peakRssBytes,
  submittedBeliefs,
  submittedGoals,
  actionSources,
  firstNarsOperation,
  narsOperations,
  effectiveNarsOperations: narsOperations.filter((operation) => operation.worldChanged).length,
  finalState: game === "bandrobot"
    ? { position: state.position, target: state.target, goal: state.goal, picked: state.picked, successes: state.successes }
    : null,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
