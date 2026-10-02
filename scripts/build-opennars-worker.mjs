import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptsDirectory, "..");
const defaultOpenNarsRoot = resolve(projectRoot, "..", "OpenNARS-304-ts");
const openNarsRoot = resolve(process.env.OPENNARS_TS_ROOT ?? defaultOpenNarsRoot);
const outputDirectory = resolve(projectRoot, "public");

function runGit(...args) {
  return execFileSync("git", ["-C", openNarsRoot, ...args], { encoding: "utf8" }).trim();
}

function assertFile(path, description) {
  if (!existsSync(path)) throw new Error(`${description} not found: ${path}`);
}

const packagePath = resolve(openNarsRoot, "package.json");
const configPath = resolve(openNarsRoot, "config", "defaultConfig.xml");
assertFile(packagePath, "OpenNARS package manifest");
assertFile(configPath, "OpenNARS default configuration");

const trackedChanges = runGit("status", "--porcelain", "--untracked-files=no");
if (trackedChanges.length > 0 && process.env.ALLOW_DIRTY_OPENNARS !== "1") {
  throw new Error("OpenNARS source has tracked changes. Build from a clean commit or set ALLOW_DIRTY_OPENNARS=1 deliberately.");
}

const openNarsPackage = JSON.parse(readFileSync(packagePath, "utf8"));
const sourceCommit = runGit("rev-parse", "HEAD");
const sourceCommitShort = sourceCommit.slice(0, 8);
const defaultConfigXml = readFileSync(configPath, "utf8");
const buildTime = new Date();
const buildTimeIso = buildTime.toISOString();
const nodeModules = resolve(process.env.OPENNARS_NODE_MODULES ?? openNarsRoot, process.env.OPENNARS_NODE_MODULES ? "." : "node_modules");
mkdirSync(outputDirectory, { recursive: true });
for (const staleArtifact of ["nars-worker.js.map", "nars-worker.js.LEGAL.txt"]) {
  rmSync(resolve(outputDirectory, staleArtifact), { force: true });
}

const browserAdapterDirectory = resolve(projectRoot, "src", "browser-adapters");
const browserAdapterPlugin = {
  name: "opennars-browser-adapters",
  setup(build) {
    build.onResolve({ filter: /^@opennars\// }, ({ path }) => ({
      path: resolve(openNarsRoot, "src", path.slice("@opennars/".length)),
    }));
    build.onResolve({ filter: /native-host-adapter\.ts$/ }, () => ({
      path: resolve(openNarsRoot, "src", "platform", "browser", "native-host-adapter.ts"),
    }));
    build.onResolve({ filter: /platform[\\/]host-adapter\.ts$/ }, () => ({
      path: resolve(openNarsRoot, "src", "platform", "browser", "native-host-adapter.ts"),
    }));
    build.onResolve({ filter: /^(?:node:)?(?:fs|path|os|url|child_process|process|crypto|util|stream)$/ }, ({ path }) => ({
      path: resolve(browserAdapterDirectory, `${path.replace(/^node:/, "")}.js`),
    }));
  },
};

const browserHostBanner = `globalThis.__OPENNARS_DEFAULT_CONFIG__ = ${JSON.stringify(defaultConfigXml)};`;

const modulePath = (relativePath) => JSON.stringify(resolve(openNarsRoot, relativePath).replaceAll("\\", "/"));
const workerSource = `
  import { Nar } from ${modulePath("src/main/Nar.ts")};
  import { Debug } from ${modulePath("src/main/Debug.ts")};
  import { Events } from ${modulePath("src/io/events/Events.ts")};
  import { OutputHandler } from ${modulePath("src/io/events/OutputHandler.ts")};
  import { TextOutputHandler } from ${modulePath("src/io/events/TextOutputHandler.ts")};

  const BUILD = Object.freeze({
    packageVersion: ${JSON.stringify(openNarsPackage.version)},
    coreVersion: String(Nar.VERSION),
    sourceCommit: ${JSON.stringify(sourceCommit)},
    sourceCommitShort: ${JSON.stringify(sourceCommitShort)},
    builtAt: ${JSON.stringify(buildTimeIso)}
  });
  const CYCLE_COMMAND = /^:(?:cycle|cycles|step)\\s+(\\d+)$/i;
  const VOLUME_COMMAND = /^:volume(?:\\s+|=)(\\d+)$/i;
  const MAX_CYCLES_PER_COMMAND = 1_000_000;
  const HELP = [
    "Narsese lines are submitted without implicit cycles.",
    ":cycles N  run N inference cycles (aliases: :cycle N, :step N)",
    ":status    show the current cycle clock and running state",
    ":volume N  set the native derived-task output volume from 0 to 100",
    ":reset     reset memory and the cycle clock",
    ":version   show core, package, and source versions",
    ":help      show this command list",
    "Ctrl+C or the INTERRUPT button restarts the isolated worker."
  ];

  let nar = null;

  const send = (type, payload = {}) => self.postMessage({ type, ...payload });
  const errorText = (error) => error instanceof Error ? (error.stack ?? error.message) : String(error);

  function output(text, channel = "shell") {
    send("output", { text: String(text), channel, time: nar === null ? "0" : String(nar.time()) });
  }

  function attachOutput(reasoner) {
    const channels = [
      [OutputHandler.OUT, "out", "OUT"],
      [OutputHandler.EXE, "exe", "EXE"],
      [OutputHandler.ERR, "error", "ERR"],
      [OutputHandler.ECHO, "echo", "ECHO"],
      [Events.Answer, "answer", "Answer"],
      [OutputHandler.ANTICIPATE, "anticipate", "ANTICIPATE"],
      [OutputHandler.CONFIRM, "confirm", "CONFIRM"],
      [OutputHandler.DISAPPOINT, "disappoint", "DISAPPOINT"]
    ];
    for (const [eventType, channelName, channelLabel] of channels) {
      reasoner.on(eventType.class, {
        event(channel, args) {
          try {
            const rendered = TextOutputHandler.getOutputString(channel, args[0], false, true, reasoner);
            if (rendered !== null && String(rendered).length > 0) output(\`\${channelLabel}: \${String(rendered)}\`, channelName);
          } catch (error) {
            output(\`[render-error] \${errorText(error)}\`, "error");
          }
        }
      });
    }
  }

  function createReasoner(configText = null) {
    Debug.TEST = true;
    nar = configText === null ? new Nar() : new Nar({ configText });
    attachOutput(nar);
  }

  function handleLine(rawLine) {
    const line = String(rawLine ?? "").trim();
    if (line.length === 0) return;
    if (line === ":help") {
      for (const helpLine of HELP) output(helpLine);
      return;
    }
    if (line === ":reset" || line === "*reset") {
      nar.reset();
      output("[shell] reset");
      return;
    }
    if (line === ":status") {
      output(\`[shell] time=\${String(nar.time())} running=\${String(nar.isRunning())} volume=\${String(nar.narParameters.VOLUME)}\`);
      return;
    }
    if (line === ":version") {
      output(\`[shell] OpenNARS \${BUILD.coreVersion} / opennars-304-ts \${BUILD.packageVersion} / \${BUILD.sourceCommitShort}\`);
      return;
    }
    const cycleMatch = CYCLE_COMMAND.exec(line);
    if (cycleMatch !== null) {
      const count = Number(cycleMatch[1]);
      if (!Number.isSafeInteger(count) || count < 1 || count > MAX_CYCLES_PER_COMMAND) {
        throw new Error(\`:cycles must be an integer from 1 to \${MAX_CYCLES_PER_COMMAND}\`);
      }
      nar.cycles(count);
      output(\`[shell] cycles=\${count} time=\${String(nar.time())}\`);
      return;
    }
    const volumeMatch = VOLUME_COMMAND.exec(line);
    if (volumeMatch !== null) {
      const volume = Number(volumeMatch[1]);
      if (!Number.isInteger(volume) || volume < 0 || volume > 100) {
        throw new Error(":volume must be an integer from 0 to 100");
      }
      nar.addInput(\`*volume=\${volume}\`);
      output(\`[shell] volume=\${volume}\`);
      return;
    }
    if (line === ":quit" || line === ":exit") {
      output("[shell] browser session remains open; use RESET SESSION to restart it.");
      return;
    }
    nar.addInput(line);
  }

  try {
    createReasoner();
    send("ready", { build: BUILD, time: String(nar.time()), volume: nar.narParameters.VOLUME });
  } catch (error) {
    send("fatal", { error: errorText(error) });
  }

  self.addEventListener("message", ({ data }) => {
    if (data?.type === "config" && typeof data.text === "string") {
      send("busy", { busy: true });
      try {
        createReasoner(data.text);
        send("configured", { source: data.name ?? "custom configuration", time: String(nar.time()), volume: nar.narParameters.VOLUME });
      } catch (error) {
        output(\`[config-error] \${errorText(error)}\`, "error");
        send("complete", { time: String(nar?.time?.() ?? 0), volume: nar?.narParameters?.VOLUME ?? 100, failed: true });
      } finally {
        send("busy", { busy: false });
      }
      return;
    }
    if (data?.type !== "command" || nar === null) return;
    send("busy", { busy: true });
    try {
      const lines = Array.isArray(data.lines) ? data.lines : [data.line];
      for (const line of lines) handleLine(line);
      send("complete", { time: String(nar.time()), volume: nar.narParameters.VOLUME });
    } catch (error) {
      output(\`[shell-error] \${errorText(error)}\`, "error");
      send("complete", { time: String(nar.time()), volume: nar.narParameters.VOLUME, failed: true });
    } finally {
      send("busy", { busy: false });
    }
  });
`;

await esbuild.build({
  stdin: {
    contents: workerSource,
    loader: "ts",
    resolveDir: openNarsRoot,
    sourcefile: "opennars-browser-worker.ts",
  },
  outfile: resolve(outputDirectory, "nars-worker.js"),
  bundle: true,
  minify: true,
  sourcemap: false,
  platform: "browser",
  format: "iife",
  target: ["es2022"],
  treeShaking: true,
  legalComments: "eof",
  nodePaths: [nodeModules],
  banner: { js: browserHostBanner },
  plugins: [browserAdapterPlugin],
  logLevel: "info",
});

await esbuild.build({
  entryPoints: [resolve(projectRoot, "src", "demo-worker.ts")],
  outfile: resolve(outputDirectory, "demo-worker.js"),
  bundle: true,
  minify: true,
  sourcemap: false,
  platform: "browser",
  format: "iife",
  target: ["es2022"],
  treeShaking: true,
  legalComments: "eof",
  nodePaths: [nodeModules],
  banner: { js: browserHostBanner },
  plugins: [browserAdapterPlugin],
  logLevel: "info",
});

await esbuild.build({
  entryPoints: [resolve(projectRoot, "src", "microworld-worker.ts")],
  outfile: resolve(outputDirectory, "microworld-worker.js"),
  bundle: true,
  minify: true,
  sourcemap: false,
  platform: "browser",
  format: "iife",
  target: ["es2022"],
  treeShaking: true,
  legalComments: "eof",
  nodePaths: [nodeModules],
  banner: { js: browserHostBanner },
  plugins: [browserAdapterPlugin],
  logLevel: "info",
});

const metadata = {
  application: "OpenNARS 3.0.4 TypeScript Demo Lab",
  packageVersion: openNarsPackage.version,
  coreVersion: "v3.0.4",
  sourceCommit,
  sourceCommitShort,
  builtAt: buildTimeIso,
  buildTimeZone: "Asia/Shanghai",
};
writeFileSync(resolve(outputDirectory, "build-meta.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ ok: true, outputDirectory, ...metadata }, null, 2));
