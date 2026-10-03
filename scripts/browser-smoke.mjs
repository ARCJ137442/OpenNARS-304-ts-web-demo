import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:4321/";
const executablePath = process.env.CHROME_PATH
  ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
mkdirSync(resolve("test-results"), { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const consoleErrors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

try {
  await page.addInitScript(() => {
    window.__demoWorkerEvents = [];
    const NativeWorker = window.Worker;
    window.Worker = new Proxy(NativeWorker, {
      construct(Target, args) {
        const worker = Reflect.construct(Target, args);
        const send = worker.postMessage.bind(worker);
        worker.postMessage = (message, transfer) => {
          window.__demoWorkerEvents.push({ direction: "out", message });
          return send(message, transfer);
        };
        worker.addEventListener("message", (event) => {
          window.__demoWorkerEvents.push({ direction: "in", message: event.data });
        });
        worker.addEventListener("error", (event) => {
          window.__demoWorkerEvents.push({ direction: "error", message: event.message });
        });
        return worker;
      },
    });
  });
  const workerRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("worker.js")) workerRequests.push(request.url());
  });
  await page.goto(baseUrl);
  await page.locator("#lab-preview").waitFor({ state: "visible" });
  assert.match(await page.locator(".launch-link").getAttribute("href"), /microworld\.html\?seed=19&knowledge=starter/);
  await page.waitForFunction(() => {
    const canvas = document.querySelector("#lab-preview");
    if (!(canvas instanceof HTMLCanvasElement)) return false;
    const context = canvas.getContext("2d");
    if (!context) return false;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let variations = 0;
    for (let index = 4; index < pixels.length; index += 4) {
      if (pixels[index] !== pixels[0] || pixels[index + 1] !== pixels[1] || pixels[index + 2] !== pixels[2]) variations += 1;
      if (variations > 64) return true;
    }
    return false;
  });
  assert.equal(workerRequests.length, 0, "the index must remain free of NARS Workers");
  await page.screenshot({ path: "test-results/demo-lab-home.png", fullPage: true });

  const operationFindings = [];
  for (const game of ["pong", "alien", "bandrobot", "cartpole", "hunt", "tictactoe", "shot", "testchamber", "fighterplane", "echo-relay"]) {
    await page.goto(new URL(`demo.html?game=${game}`, baseUrl).href);
    await page.locator("#game-runtime.ready").waitFor({ timeout: 30000 });
    await page.locator("#babble-control").evaluate((input) => { input.value = "0"; input.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.locator("#reset-demo").click();
    await page.locator("#game-runtime.ready").waitFor({ timeout: 30000 });
    await page.waitForFunction(() => Number(document.querySelector("#game-step")?.textContent) > 0, undefined, { timeout: 30000 });
    if (["pong", "alien", "bandrobot", "cartpole", "hunt", "fighterplane"].includes(game)) {
      await page.waitForFunction(() => (window.__demoWorkerEvents ?? []).some(({ direction, message }) =>
        direction === "in" && message?.type === "step-complete"
        && message.source === "NARS" && typeof message.action === "string"),
      undefined, { timeout: 30000 });
    }
    await page.getByText("性能诊断", { exact: true }).click();
    await page.locator("#concept-count").waitFor({ state: "visible" });
    await page.waitForFunction(() => !document.querySelector("#fps-hud")?.textContent?.includes("--"), undefined, { timeout: 5000 });
    await page.waitForFunction(() => !document.querySelector("#tps-hud")?.textContent?.includes("读取中") && !document.querySelector("#rps-hud")?.textContent?.includes("读取中"), undefined, { timeout: 5000 });
    for (const id of ["fps-hud", "tps-hud", "rps-hud", "fps-bar", "tps-bar", "rps-bar"]) await page.locator(`#${id}`).waitFor({ state: "visible" });
    await page.locator("#toggle-rate-hud").click();
    await page.locator("#rate-hud").waitFor({ state: "hidden" });
    await page.locator("#toggle-rate-hud").click();
    await page.locator("#rate-hud").waitFor({ state: "visible" });
    const asyncStart = Number(await page.locator("#game-step").textContent());
    const asyncReasonerStart = game === "cartpole" ? await page.evaluate(() => ({
      requests: window.__demoWorkerEvents.filter(({ direction, message }) => direction === "out" && message?.type === "step").length,
      completions: window.__demoWorkerEvents.filter(({ direction, message }) => direction === "in" && message?.type === "step-complete").length,
    })) : null;
    await page.locator("#mode-async").check();
    await page.waitForTimeout(300);
    assert.equal(await page.locator("#runtime-mode").textContent(), "异步");
    assert.ok(Number(await page.locator("#game-step").textContent()) > asyncStart, `${game} async mode should advance world ticks while NARS runs`);
    if (asyncReasonerStart !== null) {
      await page.waitForFunction(({ requests, completions }) => {
        const events = window.__demoWorkerEvents;
        return events.filter(({ direction, message }) => direction === "out" && message?.type === "step").length >= requests + 2
          && events.filter(({ direction, message }) => direction === "in" && message?.type === "step-complete").length >= completions + 2;
      }, asyncReasonerStart, { timeout: 10000 });
    }
    await page.locator("#mode-sync").check();
    assert.equal(await page.locator("#runtime-mode").textContent(), "同步");
    const canvasHasPixels = await page.locator("#game-canvas").evaluate((canvas) => {
      const context = canvas.getContext("2d");
      if (!context) return false;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels.some((value, index) => index % 4 !== 3 && value > 32);
    });
    assert.ok(canvasHasPixels, `${game} canvas should contain the running scene`);
    await page.waitForTimeout(1500);
    const nonBabbleExecution = await page.evaluate(() => (window.__demoWorkerEvents ?? []).some(({ direction, message }) => direction === "in" && message?.type === "step-complete" && message?.source === "NARS" && typeof message?.action === "string"));
    operationFindings.push({ game, babble: 0, nonBabbleExe: nonBabbleExecution, interpretation: nonBabbleExecution ? "NARS emitted an operator action" : "No NARS operator action observed in this smoke window" });
    await page.getByRole("button", { name: "暂停" }).click();
    await page.getByText("PAUSED", { exact: true }).waitFor();
    const frozenStep = await page.locator("#game-step").textContent();
    await page.getByRole("button", { name: "单步" }).click();
    await page.waitForFunction((previous) => document.querySelector("#game-step")?.textContent !== previous, frozenStep, { timeout: 10000 });
    assert.equal(errors.length, 0, `page errors during ${game}: ${errors.join("; ")}`);
  }

  await page.goto(new URL("microworld.html", baseUrl).href);
  await page.locator(".runtime-pill.ready").waitFor({ timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector("#fps-hud")?.textContent?.includes("--"), undefined, { timeout: 5000 });
  await page.locator("#toggle-rate-hud").click();
  await page.locator("#rate-hud").waitFor({ state: "hidden" });
  await page.locator("#toggle-rate-hud").click();
  await page.locator("#rate-hud").waitFor({ state: "visible" });
  assert.ok(await page.locator("#tps-target").textContent());
  assert.ok(await page.locator("#tps-ratio").textContent());
  await page.getByText("性能诊断", { exact: true }).click();
  assert.ok(await page.locator("#concept-count").textContent());
  await page.screenshot({ path: "test-results/microworld-desktop.png", fullPage: true });
  await page.goto(new URL("microworld.html?seed=19&knowledge=starter", baseUrl).href);
  await page.locator(".runtime-pill.ready").waitFor({ timeout: 30000 });
  assert.equal(await page.locator("#knowledge-toggle").getAttribute("aria-pressed"), "true");
  await page.locator("#nars-babble").evaluate((input) => {
    input.value = "0";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#reset-run").click();
  await page.locator(".runtime-pill.ready").waitFor({ timeout: 30000 });
  await page.waitForFunction(() => (window.__demoWorkerEvents ?? []).some(({ direction, message }) =>
    direction === "in" && message?.type === "step-complete"
    && message.actionSource === "NARS" && message.action > 0),
  undefined, { timeout: 30000 });
  const microworldStarterOperation = await page.evaluate(() => (window.__demoWorkerEvents ?? []).some(({ direction, message }) =>
    direction === "in" && message?.type === "step-complete"
    && message.actionSource === "NARS" && message.action > 0));
  await page.locator("#knowledge-toggle").click();
  assert.equal(await page.locator("#knowledge-toggle").getAttribute("aria-pressed"), "false");
  const microworldClassicPriorCount = await page.evaluate(() => [...window.__demoWorkerEvents].reverse()
    .find(({ direction, message }) => direction === "out" && message?.type === "reset")?.message.priorRules.length);
  assert.equal(microworldClassicPriorCount, 0);
  await page.goto(new URL("demo.html?game=echo-relay", baseUrl).href);
  await page.locator("#game-runtime.ready").waitFor({ timeout: 30000 });
  await page.locator("#echo-map-details summary").click();
  await page.locator("#echo-truth-map").waitFor({ state: "visible" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL("demo.html?game=hunt", baseUrl).href);
  await page.locator("#game-runtime.ready").waitFor({ timeout: 30000 });
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(horizontalOverflow, false, "game workspace should fit a narrow mobile viewport");
  assert.equal(errors.length, 0, `browser errors: ${errors.join("; ")}`);
  console.log(JSON.stringify({ ok: true, games: 10, operationFindings, microworld: true,
    microworldStarterOperation, microworldClassicPriorCount,
    indexCanvas: true, homeWorkers: 0, pageErrors: errors.length }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    error: error instanceof Error ? error.message : String(error),
    pageErrors: errors,
    consoleErrors,
    workers: page.workers().map((worker) => worker.url()),
    workerEvents: await page.evaluate(() => window.__demoWorkerEvents ?? []),
    runtime: await page.locator("#game-runtime").textContent().catch(() => null),
    status: await page.locator("#game-status").textContent().catch(() => null),
  }, null, 2));
  throw error;
} finally {
  await browser.close();
}
