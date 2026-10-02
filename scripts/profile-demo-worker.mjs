#!/usr/bin/env node
// Run the built browser Worker and the same TypeScript world model in Node.
// This isolates inference from canvas/scheduling while preserving the inputs.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_DEFINITIONS, advanceDemo, buildNarsStep, createDemoState } from "../src/games/models.ts";

const args = Object.fromEntries(process.argv.slice(2).flatMap((argument, index, all) =>
  argument.startsWith("--") && all[index + 1] && !all[index + 1].startsWith("--")
    ? [[argument.slice(2), all[index + 1]]]
    : []));
const game = args.game ?? "cartpole";
const seed = Number(args.seed ?? 3040304);
const ticks = Number(args.ticks ?? 67);
const cycles = Number(args.cycles ?? 5);
const reportEvery = Number(args["report-every"] ?? 10);
const output = resolve(args.output ?? "test-results/profile-demo-worker.json");
const definition = DEMO_DEFINITIONS[game];
if (!definition || !Number.isSafeInteger(seed) || !Number.isSafeInteger(ticks) || !Number.isSafeInteger(cycles)
  || !Number.isSafeInteger(reportEvery) || seed < 1 || ticks < 1 || cycles < 1 || reportEvery < 1) {
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
send({ type: "init", game, seed, actions: definition.actions, priorRules: definition.narsPriorRules ?? [] });
if (messages.some((message) => message.type === "fault")) throw new Error("Worker initialization fault");

const segments = [];
let elapsed = [];
let lastConcepts = 0;
let peakRssBytes = process.memoryUsage().rss;
for (let tick = 1; tick <= ticks; tick += 1) {
  const input = buildNarsStep(state);
  const start = performance.now();
  send({ type: "step", game, step: state.tick + 1, ...input, cycles, babble: definition.babble });
  const response = messages.findLast((message) => message.type === "step-complete" || message.type === "fault");
  if (response?.type !== "step-complete") throw new Error(`Worker fault at tick ${tick}: ${response?.message ?? "missing response"}`);
  elapsed.push(performance.now() - start);
  lastConcepts = Number(response.reasoner?.concepts ?? 0);
  advanceDemo(state, response.action ?? null);
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
  configuration: { game, seed, ticks, cycles, reportEvery },
  segments,
  finalConcepts: lastConcepts,
  peakRssBytes,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
