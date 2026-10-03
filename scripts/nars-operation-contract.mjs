import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:4321/opennars-304-ts-lab/";
const executablePath = process.env.CHROME_PATH
  ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage();

try {
  await page.goto(new URL("demo.html?game=pong", baseUrl).href);
  const results = await page.evaluate(async () => {
    const cases = [
      { id: "tictactoe", action: "^cell0" },
      { id: "shot", action: "^shoot" },
      { id: "testchamber", action: "^activate" },
      { id: "fighterplane", action: "^fire" },
      { id: "echo-relay", action: "^ping" },
    ];

    const run = (entry) => new Promise((resolve) => {
      const worker = new Worker("./demo-worker.js");
      const events = [];
      const timer = window.setTimeout(() => {
        worker.terminate();
        resolve({ id: entry.id, action: entry.action, result: "timeout", events });
      }, 15000);
      worker.addEventListener("message", ({ data }) => {
        events.push(data);
        if (data.type === "ready") {
          const actionGoal = `(${entry.action},{SELF})! :|:`;
          worker.postMessage({
            type: "step",
            game: entry.id,
            step: 1,
            goals: [actionGoal],
            beliefs: [],
            feedback: [],
            cycles: 40,
            babble: 0,
          });
        }
        if (data.type === "step-complete" || data.type === "fault") {
          window.clearTimeout(timer);
          worker.terminate();
          resolve({
            id: entry.id,
            action: entry.action,
            result: data.type,
            source: data.source,
            executed: events.some((event) => event.type === "operation" && event.action === entry.action),
            events: events.map((event) => ({ type: event.type, action: event.action, source: event.source, message: event.message })),
          });
        }
      });
      worker.addEventListener("error", (event) => {
        window.clearTimeout(timer);
        worker.terminate();
        resolve({ id: entry.id, action: entry.action, result: "worker-error", message: event.message, events });
      });
      worker.postMessage({ type: "init", game: entry.id, seed: 304, actions: [entry.action] });
    });

    const output = [];
    for (const entry of cases) output.push(await run(entry));
    return output;
  });

  for (const result of results) {
    console.log(JSON.stringify(result));
    assert.equal(result.result, "step-complete", `${result.id}: operation goal must parse and step`);
    assert.equal(result.source, "NARS", `${result.id}: action source must be NARS, with Babble disabled`);
    assert.equal(result.executed, true, `${result.id}: registered operator must emit operation event`);
  }
} finally {
  await browser.close();
}
