import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pagesRootArgument = process.argv[2] ?? process.env.ARCJ137442_PAGES_ROOT;
if (!pagesRootArgument) {
  throw new Error("Pass the ARCJ137442.github.io repository path or set ARCJ137442_PAGES_ROOT.");
}

const pagesRoot = resolve(pagesRootArgument);
if (!existsSync(resolve(pagesRoot, ".git"))) throw new Error(`Not a Git repository: ${pagesRoot}`);

const destination = resolve(pagesRoot, "opennars-304-ts-lab");
const relativeDestination = relative(pagesRoot, destination);
if (relativeDestination.startsWith("..") || relativeDestination === "") {
  throw new Error(`Unsafe deployment destination: ${destination}`);
}

execFileSync("npm", ["run", "build"], { cwd: projectRoot, stdio: "inherit", shell: process.platform === "win32" });
execFileSync(process.execPath, [resolve(projectRoot, "scripts", "check-build.mjs")], { stdio: "inherit" });

function copyTree(source, target) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source)) {
    const sourcePath = resolve(source, entry);
    const targetPath = resolve(target, entry);
    if (statSync(sourcePath).isDirectory()) copyTree(sourcePath, targetPath);
    else copyFileSync(sourcePath, targetPath);
  }
}
copyTree(resolve(projectRoot, "dist"), destination);

console.log(JSON.stringify({ ok: true, pagesRoot, destination }, null, 2));
