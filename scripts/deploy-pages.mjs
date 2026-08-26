import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pagesRootArgument = process.argv[2] ?? process.env.ARCJ137442_PAGES_ROOT;
if (!pagesRootArgument) {
  throw new Error("Pass the ARCJ137442.github.io repository path or set ARCJ137442_PAGES_ROOT.");
}

const pagesRoot = resolve(pagesRootArgument);
if (!existsSync(resolve(pagesRoot, ".git"))) throw new Error(`Not a Git repository: ${pagesRoot}`);

const destination = resolve(pagesRoot, "opennars-304-ts");
const relativeDestination = relative(pagesRoot, destination);
if (relativeDestination.startsWith("..") || relativeDestination === "") {
  throw new Error(`Unsafe deployment destination: ${destination}`);
}

execFileSync(process.execPath, [resolve(projectRoot, "scripts", "build.mjs")], { stdio: "inherit" });
execFileSync(process.execPath, [resolve(projectRoot, "scripts", "check-build.mjs")], { stdio: "inherit" });

mkdirSync(destination, { recursive: true });
for (const file of ["index.html", "styles.css", "app.js", "input-behavior.js", "nars-worker.js", "build-meta.json", "README.md"]) {
  copyFileSync(resolve(projectRoot, "dist", file), resolve(destination, file));
}

console.log(JSON.stringify({ ok: true, pagesRoot, destination }, null, 2));
