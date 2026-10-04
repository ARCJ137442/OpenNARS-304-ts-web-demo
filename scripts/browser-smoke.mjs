import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:4321/opennars-304-ts-lab/";
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
  const slashlessBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const entryPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const spriteResponses = new Map();
  entryPage.on("response", (response) => {
    if (response.url().includes("/assets/") && (response.url().endsWith(".png") || response.url().endsWith("opennars-ts-logo.svg"))) {
      spriteResponses.set(new URL(response.url()).pathname.split("/").at(-1), response.status());
    }
  });
  await entryPage.goto(slashlessBaseUrl);
  await entryPage.locator("#lab-preview").waitFor({ state: "visible" });
  await entryPage.waitForFunction(() => {
    const canvas = document.querySelector("#lab-preview");
    if (!(canvas instanceof HTMLCanvasElement)) return false;
    const context = canvas.getContext("2d");
    if (!context) return false;
    const pixels = context.getImageData(Math.floor(canvas.width * .7) - 12, Math.floor(canvas.height * .34) - 12, 24, 24).data;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 1] > pixels[index] + 25 && pixels[index + 1] > pixels[index + 2] + 20) return true;
    }
    return false;
  }, undefined, { timeout: 10000 });
  for (const name of ["agent.png", "food.png", "fire.png", "ball.png", "bar.png", "opennars-ts-logo.svg"]) {
    assert.equal(spriteResponses.get(name), 200, `the slashless Lab URL must load ${name}`);
  }
  const logoGeometry = await entryPage.locator(".wordmark-logo").evaluate((image) => ({ complete: image.complete, width: image.naturalWidth, height: image.naturalHeight }));
  assert.equal(logoGeometry.complete, true, "the TS wordmark SVG must load");
  assert.ok(logoGeometry.width > 0 && logoGeometry.height > 0, "the TS wordmark SVG must have intrinsic dimensions");
  assert.ok(Math.abs(logoGeometry.width / logoGeometry.height - 720.79 / 608.59) < 0.02, "the TS wordmark must preserve the reference aspect ratio");
  await entryPage.getByRole("link", { name: "NARS 终端", exact: true }).click();
  assert.match(entryPage.url(), /\/opennars-304-ts-lab\/terminal\.html$/);
  await entryPage.waitForFunction(() => document.querySelector("#runtime-state")?.textContent?.includes("WORKER ONLINE"), undefined, { timeout: 30000 });
  assert.equal(await entryPage.locator(".send-button svg").count(), 1, "terminal action icons must render");
  assert.equal(await entryPage.locator("#experience-panel").getAttribute("open"), null, "experience observatory stays collapsed initially");
  assert.equal(await entryPage.locator("details.telemetry-details:not(.experience-panel)").getAttribute("open"), null, "advanced runtime details stay collapsed initially");
  await entryPage.locator("#terminal-input").fill("<bird --> animal>.\n:cycles 2");
  await entryPage.locator(".send-button").click();
  await entryPage.waitForFunction(() => Number(document.querySelector("#cycle-clock")?.textContent) >= 2, undefined, { timeout: 30000 });
  assert.match(await entryPage.locator("#terminal-output").innerText(), /bird --> animal/);
  await entryPage.locator("#terminal-input").fill("<(*, {SELF}) --> ^left>! :|:\n:cycles 10");
  await entryPage.locator(".send-button").click();
  await entryPage.waitForFunction(() => Number(document.querySelector("#cycle-clock")?.textContent) >= 12, undefined, { timeout: 30000 });
  assert.match(await entryPage.locator("#terminal-output").innerText(), /\^left/);
  await entryPage.locator("#interrupt-button").click();
  await entryPage.waitForFunction(() => document.querySelector("#runtime-state")?.textContent?.includes("WORKER ONLINE")
    && Number(document.querySelector("#cycle-clock")?.textContent) === 0, undefined, { timeout: 30000 });
  await entryPage.screenshot({ path: "test-results/demo-lab-terminal.png", fullPage: true });
  await entryPage.locator("#experience-panel > summary").scrollIntoViewIfNeeded();
  await entryPage.locator("#experience-panel > summary").evaluate((summary) => summary.click());
  await entryPage.locator("#terminal-input").fill("<bird --> animal>.\n:cycles 2");
  await entryPage.locator(".send-button").click();
  await entryPage.waitForFunction(() => document.querySelectorAll("#experience-list .experience-entry").length > 0, undefined, { timeout: 30000 });
  assert.match(await entryPage.locator("#experience-list").innerText(), /NARS 内部/);
  await entryPage.locator("details.telemetry-details:not(.experience-panel) > summary").click();
  await entryPage.locator("#source-commit").waitFor({ state: "visible" });
  await entryPage.close();

  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await mobilePage.goto(new URL("terminal.html", baseUrl).href);
  await mobilePage.waitForFunction(() => document.querySelector("#runtime-state")?.textContent?.includes("WORKER ONLINE"), undefined, { timeout: 30000 });
  const mobileOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(mobileOverflow <= 1, `terminal must fit the narrow viewport (overflow ${mobileOverflow}px)`);
  await mobilePage.locator("#terminal-input").focus();
  await mobilePage.locator("#terminal-input").fill("<robin --> bird>.");
  await mobilePage.locator("#terminal-input").press("Enter");
  await mobilePage.waitForFunction(() => document.querySelector("#terminal-output")?.textContent?.includes("robin --> bird"), undefined, { timeout: 30000 });
  await mobilePage.screenshot({ path: "test-results/demo-lab-terminal-mobile.png", fullPage: true });
  await mobilePage.close();

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
  assert.equal(await page.locator('[data-experiment="terminal"] canvas[data-preview="terminal"]').count(), 1);
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

  await page.goto(new URL("gridworld.html", baseUrl).href);
  await page.locator('#grid-runtime[data-state="ready"]').waitFor({ timeout: 30000 });
  for (const topology of ["square", "triangle", "hexagon"]) {
    await page.locator("#grid-topology").selectOption(topology);
    await page.locator('#grid-runtime[data-state="ready"]').waitFor({ timeout: 30000 });
    await page.waitForFunction(() => Number(document.querySelector("#grid-step-count")?.textContent) > 0, undefined, { timeout: 30000 });
    const gridCanvasHasPixels = await page.locator("#grid-canvas").evaluate((canvas) => {
      const context = canvas.getContext("2d");
      if (!context) return false;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels.some((value, index) => index % 4 !== 3 && value > 25);
    });
    assert.equal(gridCanvasHasPixels, true, `${topology} Grid Microworld canvas should contain the running scene`);
  }
  await page.locator("#grid-experience-panel > summary").evaluate((summary) => summary.click());
  await page.waitForFunction(() => document.querySelectorAll("#grid-experience-list .experience-entry").length > 0, undefined, { timeout: 30000 });
  assert.match(await page.locator("#grid-experience-list").innerText(), /NARS 内部/);
  await page.waitForFunction(() => (window.__demoWorkerEvents ?? []).some(({ direction, message }) =>
    direction === "in" && message?.type === "step-complete" && (message.actionSource === "NARS" || message.actionSource === "babble")), undefined, { timeout: 30000 });
  await page.screenshot({ path: "test-results/gridworld-topologies.png", fullPage: true });

  await page.goto(new URL("nars2048.html", baseUrl).href);
  await page.waitForFunction(() => document.querySelector("#n2048-runtime")?.textContent?.includes("NARS 在线"), undefined, { timeout: 30000 });
  assert.ok(await page.locator("#board").evaluate((canvas) => canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0));
  await page.locator("#reset-board").click();
  assert.equal(await page.locator("#round-count").textContent(), "2");
  await page.locator("#reset-memory").click();
  assert.equal(await page.locator("#round-count").textContent(), "1");
  await page.locator("#n2048-experience > summary").evaluate((summary) => summary.click());
  await page.waitForFunction(() => document.querySelectorAll("#experience-list .experience-entry").length > 0, undefined, { timeout: 30000 });
  assert.match(await page.locator("#experience-list").innerText(), /NARS 内部/);

  const pongFindings = [];
  const pongModes = [
    "classic", "center-stop", "difference", "two-controller", "adversarial",
    "two-player", "two-player-single", "two-player-no-diff", "two-player-diff",
  ];
  await page.goto(new URL("pong.html", baseUrl).href);
  await page.locator("#pong-runtime").waitFor({ state: "visible", timeout: 30000 });
  for (const mode of pongModes) {
    await page.locator("#pong-mode").selectOption(mode);
    await page.evaluate(() => { window.__demoWorkerEvents = []; });
    await page.waitForFunction(() => document.querySelector("#pong-runtime")?.textContent?.includes("NARS 在线"), undefined, { timeout: 30000 });
    await page.waitForFunction(() => Number(document.querySelector("#pong-world-tick")?.textContent) > 0, undefined, { timeout: 30000 });
    const agentCount = await page.locator("#pong-agents .pong-agent").count();
    const worldTick = Number(await page.locator("#pong-world-tick").textContent());
    const canvasHasPixels = await page.locator("#pong-canvas").evaluate((canvas) => {
      const context = canvas.getContext("2d");
      if (!context) return false;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels.some((value, index) => index % 4 !== 3 && value > 32);
    });
    assert.equal(canvasHasPixels, true, `${mode} Pong canvas should contain the running scene`);
    const beforeAsync = worldTick;
    await page.locator('input[name="pong-mode"][value="async"]').check();
    await page.waitForTimeout(300);
    assert.ok(Number(await page.locator("#pong-world-tick").textContent()) > beforeAsync, `${mode} async Pong should advance world ticks`);
    await page.locator('input[name="pong-mode"][value="sync"]').check();
    await page.waitForFunction(() => (window.__demoWorkerEvents ?? []).some(({ direction, message }) =>
      direction === "in" && message?.type === "step-complete" && message?.source === "NARS" && typeof message?.action === "string"), undefined, { timeout: 30000 });
    const observedNars = await page.evaluate(() => (window.__demoWorkerEvents ?? []).some(({ direction, message }) =>
      direction === "in" && message?.type === "step-complete" && message?.source === "NARS" && typeof message?.action === "string"));
    assert.equal(observedNars, true, `${mode} Pong should observe a non-babble NARS operation`);
    pongFindings.push({ mode, agentCount, worldTick, nonBabbleOperation: observedNars });
  }
  assert.equal(errors.length, 0, `page errors during Pong modes: ${errors.join("; ")}`);

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
    if (game === "pong") {
      await page.waitForFunction(() => document.querySelector("#rps-hud")?.textContent === "0.0 RPS",
      undefined, { timeout: 5000 });
      assert.match(await page.locator("#rps-hud").getAttribute("title"), /目标 200\.0 RPS/);
    }
    const frozenStep = await page.locator("#game-step").textContent();
    await page.getByRole("button", { name: "单步" }).click();
    await page.waitForFunction((previous) => document.querySelector("#game-step")?.textContent !== previous, frozenStep, { timeout: 10000 });
    assert.equal(errors.length, 0, `page errors during ${game}: ${errors.join("; ")}`);
  }

  await page.goto(new URL("microworld.html", baseUrl).href);
  await page.locator(".runtime-pill.ready").waitFor({ timeout: 30000 });
  assert.equal(await page.locator("#experience-panel").getAttribute("open"), null, "Microworld experience observatory stays collapsed initially");
  await page.locator("#experience-panel > summary").scrollIntoViewIfNeeded();
  await page.locator("#experience-panel > summary").evaluate((summary) => summary.click());
  await page.locator("#experience-panel[open]").waitFor({ state: "attached" });
  await page.waitForFunction(() => document.querySelectorAll("#experience-list .experience-entry").length > 0, undefined, { timeout: 30000 });
  assert.match(await page.locator("#experience-list").innerText(), /NARS 内部/);
  await page.waitForFunction(() => !document.querySelector("#fps-hud")?.textContent?.includes("--"), undefined, { timeout: 5000 });
  await page.locator("#toggle-rate-hud").click();
  await page.locator("#rate-hud").waitFor({ state: "hidden" });
  await page.locator("#toggle-rate-hud").click();
  await page.locator("#rate-hud").waitFor({ state: "visible" });
  const hudGeometry = await page.evaluate(() => {
    const status = document.querySelector("#world-status");
    const ids = ["step-latency", "fps-hud", "tps-hud", "rps-hud", "fps-bar", "tps-bar", "rps-bar"];
    const read = () => ids.map((id) => {
      const rect = document.getElementById(id).getBoundingClientRect();
      return [rect.x, rect.y, rect.width];
    });
    const original = status.textContent;
    const before = read();
    status.textContent = "异步运行 · NARS 已完成";
    const after = read();
    status.textContent = original;
    return { before, after };
  });
  assert.deepEqual(hudGeometry.after, hudGeometry.before, "status wording must not move latency or rate HUD cells");
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
  console.log(JSON.stringify({ ok: true, games: 10, gridworld: true, nars2048: true, pongModes: pongFindings, operationFindings, microworld: true,
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
