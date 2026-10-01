import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = resolve(projectRoot, "dist");
const requiredFiles = [
  "index.html", "terminal.html", "demo.html", "demo-worker.js", "microworld.html", "microworld.css", "microworld.js",
  "microworld-worker.js", "styles.css", "app.js", "input-behavior.js", "build-meta.json", "README.md",
  "COPYING-GPL-3.0.txt", "COPYING-ONA-MIT.txt", ".nojekyll", "favicon.svg", "nars-controls.css", "assets/agent.png", "assets/food.png", "assets/fire.png",
  "assets/ball.png", "assets/bar.png",
];

for (const file of requiredFiles) {
  if (statSync(resolve(distRoot, file)).size === 0) throw new Error(`${file} is empty`);
}

const index = readFileSync(resolve(distRoot, "index.html"), "utf8");
for (const text of ["DEMO LAB", "NARS Pong", "BandRobot", "CartPole", "Hunt 追捕", "11 DEMOS", "TicTacToe", "Grid2D TestChamber", "FighterPlane", "Echo Relay", "data-preview=\"echo-relay\"", "data-preview=\"microworld\""]) {
  if (!index.includes(text)) throw new Error(`index.html is missing ${text}`);
}
if (!index.includes("/opennars-304-ts-lab/_astro/")) throw new Error("index.html is missing the Pages base path for Astro assets");
if (!index.includes("favicon.svg")) throw new Error("index.html is missing its favicon");
const astroAssets = readdirSync(resolve(distRoot, "_astro"));
if (astroAssets.length === 0) throw new Error("Astro-generated asset directory is empty");
for (const asset of astroAssets) {
  if (statSync(resolve(distRoot, "_astro", asset)).size === 0) throw new Error(`Astro asset is empty: ${asset}`);
}

const gamePage = readFileSync(resolve(distRoot, "demo.html"), "utf8");
for (const text of ["cycles-control", "babble-control", "source-toggle", "NARS 监视器", "/opennars-304-ts-lab/_astro/", "fps-hud", "tps-hud", "rps-hud", "tps-target", "tps-ratio", "toggle-rate-hud", "mode-sync", "mode-async", "runtime-queue", "late-actions", "echo-map-details"] ) {
  if (!gamePage.includes(text)) throw new Error(`demo.html is missing ${text}`);
}

const worker = readFileSync(resolve(distRoot, "nars-worker.js"), "utf8");
for (const text of ["OpenNARS", "opennars-304-ts", "sourceCommit", "configured"]) {
  if (!worker.includes(text)) throw new Error(`nars-worker.js is missing ${text}`);
}
const demoWorker = readFileSync(resolve(distRoot, "demo-worker.js"), "utf8");
for (const text of ["^Left", "^Right", "^Shoot", "^Pick", "step-complete"]) {
  if (!demoWorker.includes(text)) throw new Error(`demo-worker.js is missing ${text}`);
}
const microworld = readFileSync(resolve(distRoot, "microworld.html"), "utf8");
for (const text of ["world-canvas", "run-toggle", "step-once", "nars-log", "sensor-grid", "nars-cycles", "nars-babble", "Tessergon", "SimNAR.java"]) {
  if (!microworld.includes(text)) throw new Error(`microworld.html is missing ${text}`);
}
const microworldWorker = readFileSync(resolve(distRoot, "microworld-worker.js"), "utf8");
for (const text of ["^Forward", "^Right", "^Left", "step-complete", "cyclesPerStep"]) {
  if (!microworldWorker.includes(text)) throw new Error(`microworld-worker.js is missing ${text}`);
}

const metadata = JSON.parse(readFileSync(resolve(distRoot, "build-meta.json"), "utf8"));
if (metadata.coreVersion !== "v3.0.4" || !/^\d+\.\d+\.\d+$/.test(metadata.packageVersion)) {
  throw new Error("build metadata versions are invalid");
}
if (!/^[0-9a-f]{40}$/.test(metadata.sourceCommit)) throw new Error("build metadata source commit is invalid");

console.log(JSON.stringify({ ok: true, files: requiredFiles.length, astroAssets: astroAssets.length, ...metadata }, null, 2));
