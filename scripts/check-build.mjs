import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = resolve(projectRoot, "dist");
const requiredFiles = [
  "index.html", "terminal.html", "demo.html", "demo-worker.js", "microworld.html", "microworld.css", "microworld.js",
  "microworld-worker.js", "build-meta.json", "README.md",
  "COPYING-GPL-3.0.txt", "COPYING-ONA-MIT.txt", ".nojekyll", "favicon.svg", "nars-controls.css", "assets/opennars-ts-logo.svg", "assets/agent.png", "assets/food.png", "assets/fire.png",
  "assets/ball.png", "assets/bar.png",
];

for (const file of requiredFiles) {
  if (statSync(resolve(distRoot, file)).size === 0) throw new Error(`${file} is empty`);
}

const index = readFileSync(resolve(distRoot, "index.html"), "utf8");
for (const text of ["DEMO LAB", "NARS 终端", "NARS Pong", "BandRobot", "CartPole", "Hunt 追捕", "12 DEMOS", "TicTacToe", "Grid2D TestChamber", "FighterPlane", "Echo Relay", "data-preview=\"terminal\"", "data-preview=\"echo-relay\"", "data-preview=\"microworld\""]) {
  if (!index.includes(text)) throw new Error(`index.html is missing ${text}`);
}
if (!index.includes("/opennars-304-ts-lab/_astro/")) throw new Error("index.html is missing the Pages base path for Astro assets");
if (!index.includes("favicon.svg")) throw new Error("index.html is missing its favicon");
if (!index.includes("assets/opennars-ts-logo.svg")) throw new Error("index.html is missing the TypeScript logo");
if (!index.includes('<base href="/opennars-304-ts-lab/">')) throw new Error("index.html is missing its canonical asset base");
const terminal = readFileSync(resolve(distRoot, "terminal.html"), "utf8");
for (const text of ["terminal-form", "terminal-output", "cycle-clock", "runtime-state", "/opennars-304-ts-lab/_astro/"]) {
  if (!terminal.includes(text)) throw new Error(`terminal.html is missing ${text}`);
}
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
const coreRoot = resolve(process.env.OPENNARS_TS_ROOT ?? resolve(projectRoot, "..", "OpenNARS-304-ts"));
const currentCoreCommit = execFileSync("git", ["-C", coreRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (metadata.sourceCommit !== currentCoreCommit) {
  throw new Error(`Worker bundle is stale: built from ${metadata.sourceCommit}, current core is ${currentCoreCommit}`);
}
const packagedLogo = readFileSync(resolve(distRoot, "assets", "opennars-ts-logo.svg"));
const sourceLogo = readFileSync(resolve(coreRoot, "brand", "opennars-ts-logo.svg"));
if (!packagedLogo.equals(sourceLogo)) throw new Error("Demo logo differs from the canonical Core brand asset");
const logoText = packagedLogo.toString("utf8");
for (const text of ['viewBox="0 0 720.79 608.59"', 'id="typescript"', ">TS</text>"]) {
  if (!logoText.includes(text)) throw new Error(`TypeScript logo is missing ${text}`);
}

console.log(JSON.stringify({ ok: true, files: requiredFiles.length, astroAssets: astroAssets.length, ...metadata }, null, 2));
