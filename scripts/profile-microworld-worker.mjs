#!/usr/bin/env node
// Drive the built Microworld Worker with the page's world model and input order.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { applyActionAndAdvance, collectPerceptionAndReward, createRandom, createWorld } from "../src/microworld/simulation.ts";

const args = Object.fromEntries(process.argv.slice(2).flatMap((arg, index, all) =>
  arg.startsWith("--") && all[index + 1] && !all[index + 1].startsWith("--")
    ? [[arg.slice(2), all[index + 1]]]
    : []));
const seed = Number(args.seed ?? 3040304);
const ticks = Number(args.ticks ?? 100);
const cycles = Number(args.cycles ?? 10);
const babble = Number(args.babble ?? 0.1);
const reportEvery = Number(args["report-every"] ?? 20);
const output = resolve(args.output ?? "test-results/profile-microworld-worker.json");
const bundle = resolve(args.bundle ?? "public/microworld-worker.js");
const priorRules = args["prior-rules-file"]
  ? JSON.parse(readFileSync(resolve(args["prior-rules-file"]), "utf8")) : [];
if (![seed, ticks, cycles, reportEvery].every((value) => Number.isSafeInteger(value) && value > 0)
  || !Number.isFinite(babble) || babble < 0 || babble > 0.5
  || !Array.isArray(priorRules) || !priorRules.every((rule) => typeof rule === "string")) {
  throw new Error("Invalid Microworld seed, cycles, babble, report interval, or prior rules");
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gitHead = (directory) => execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const messages = [];
let receiveMessage;
globalThis.self = {
  addEventListener(type, listener) { if (type === "message") receiveMessage = listener; },
  postMessage(message) { messages.push(message); },
};
await import(pathToFileURL(bundle).href);
if (typeof receiveMessage !== "function") throw new Error("Built Worker did not register a message listener");
const send = (data) => receiveMessage({ data });
const world = createWorld(seed);
const random = createRandom(seed ^ 0x2d2d304);
send({ type: "reset", seed, priorRules });
if (messages.some((message) => message.type === "fault")) throw new Error("Microworld Worker initialization fault");

const actionSources = { NARS: 0, babble: 0, idle: 0 };
const narsOperations = [];
const sensorEvents = new Array(6).fill(0);
const segments = [];
let elapsed = [];
let lastConcepts = 0;
let peakRssBytes = process.memoryUsage().rss;
for (let tick = 1; tick <= ticks; tick += 1) {
  const perception = collectPerceptionAndReward(world, random);
  for (let sector = 0; sector < sensorEvents.length; sector += 1) {
    if (perception.sensors[sector] > 0.1) sensorEvents[sector] += 1;
  }
  const start = performance.now();
  send({ type: "step", sensors: perception.sensors, reward: perception.reward, seed, cycles, babble });
  const response = messages.findLast((message) => message.type === "step-complete" || message.type === "fault");
  if (response?.type !== "step-complete") throw new Error(`Microworld fault at tick ${tick}: ${response?.message ?? "missing response"}`);
  elapsed.push(performance.now() - start);
  lastConcepts = Number(response.reasoner?.concepts ?? 0);
  const source = response.actionSource === "NARS" || response.actionSource === "babble" ? response.actionSource : "idle";
  actionSources[source] += 1;
  if (source === "NARS") narsOperations.push({ tick, action: response.action, operator: response.operator, sensors: perception.sensors });
  applyActionAndAdvance(world, response.action ?? 0);
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
  schema: "opennars-304-ts-lab/profile-microworld-worker/v1",
  coreCommit: gitHead(resolve(projectRoot, "..", "OpenNARS-304-ts")),
  demoCommit: gitHead(projectRoot),
  nodeVersion: process.version,
  configuration: { seed, ticks, cycles, babble, reportEvery, priorRules, bundle },
  segments, finalConcepts: lastConcepts, peakRssBytes,
  actionSources, narsOperations, sensorEvents, counters: world.counters,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
