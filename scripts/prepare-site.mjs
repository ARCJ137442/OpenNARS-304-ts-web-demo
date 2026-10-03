import { copyFileSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(projectRoot, "src");
const publicRoot = resolve(projectRoot, "public");

mkdirSync(publicRoot, { recursive: true });
for (const staleFile of ["terminal.html", "styles.css", "app.js", "input-behavior.js"]) {
  rmSync(resolve(publicRoot, staleFile), { force: true });
}
for (const file of ["microworld.html", "microworld.css", "nars-controls.css"]) {
  copyFileSync(resolve(sourceRoot, file), resolve(publicRoot, file));
}
for (const file of ["COPYING-GPL-3.0.txt", "COPYING-ONA-MIT.txt"]) {
  copyFileSync(resolve(projectRoot, file), resolve(publicRoot, file));
}
cpSync(resolve(sourceRoot, "microworld", "assets"), resolve(publicRoot, "assets"), { recursive: true, force: true });

await esbuild.build({
  entryPoints: [resolve(sourceRoot, "microworld.ts")],
  outfile: resolve(publicRoot, "microworld.js"),
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  legalComments: "eof",
});

console.log(JSON.stringify({ ok: true, publicRoot, preparedFiles: 3, spriteCount: 5 }, null, 2));
