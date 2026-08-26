import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = resolve(projectRoot, "dist");
const requiredFiles = ["index.html", "styles.css", "app.js", "input-behavior.js", "nars-worker.js", "build-meta.json", "README.md"];

for (const file of requiredFiles) {
  if (statSync(resolve(distRoot, file)).size === 0) throw new Error(`${file} is empty`);
}

const html = readFileSync(resolve(distRoot, "index.html"), "utf8");
for (const requiredText of ["OPENNARS 304 TS", "INTERACTIVE BROWSER TERMINAL", "<textarea", "Shift+Enter", "NAL-8", "RUN NAL-8 BATCH", "volume-input", "data-package-version", "data-build-time"]) {
  if (!html.includes(requiredText)) throw new Error(`index.html is missing ${requiredText}`);
}

const app = readFileSync(resolve(distRoot, "app.js"), "utf8");
for (const requiredText of ["normalizeCommandLines", "requestSubmit", "refocusAfterRun", "lines }"]) {
  if (!app.includes(requiredText)) throw new Error(`app.js is missing ${requiredText}`);
}

const worker = readFileSync(resolve(distRoot, "nars-worker.js"), "utf8");
for (const requiredText of ["OpenNARS", "opennars-304-ts", "sourceCommit"]) {
  if (!worker.includes(requiredText)) throw new Error(`nars-worker.js is missing ${requiredText}`);
}

const metadata = JSON.parse(readFileSync(resolve(distRoot, "build-meta.json"), "utf8"));
if (metadata.coreVersion !== "v3.0.4" || !/^\d+\.\d+\.\d+$/.test(metadata.packageVersion)) {
  throw new Error("build metadata versions are invalid");
}
if (!/^[0-9a-f]{40}$/.test(metadata.sourceCommit)) throw new Error("build metadata source commit is invalid");

console.log(JSON.stringify({ ok: true, files: requiredFiles.length, ...metadata }, null, 2));
