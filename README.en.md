# OpenNARS 3.0.4 TypeScript Demo Lab

<img src="https://raw.githubusercontent.com/ARCJ137442/OpenNARS-304-ts/main/brand/opennars-ts-logo.svg" width="260" alt="OpenNARS TypeScript logo" />

[简体中文](README.md)

This repository contains the standalone browser demo for <https://arcj137442.github.io/opennars-304-ts-lab/>. The GitHub Pages repository stores only generated files under `opennars-304-ts-lab/`.

## Demo Lab

The index links a browser NARS terminal, Microworld, Pong, Alien, BandRobot, CartPole, Hunt, TicTacToe, Shot, Grid2D TestChamber, FighterPlane, and Echo Relay. The ordinary games share NARS Worker controls and activity monitoring; Microworld has its own adapter for the classic scene. Astro generates static HTML, CSS, and JavaScript; no Astro runtime or backend is shipped. BandRobot remains a multi-step experiment: autonomous delivery has not been demonstrated in the fixed scenario.

The plain Microworld entry starts blank with a fresh random seed, so each visit opens a new exploration. Use `microworld.html?seed=19&knowledge=starter` when you need a reproducible run or the optional starter knowledge; `seed` fixes the world and NARS initialization, while `knowledge=starter` is the explicit opt-in. Its lightbulb control switches between starter knowledge and blank exploration. Starter mode preloads one causal hypothesis connecting food directly ahead with moving forward; **NARS did not learn this rule from scratch**. A real-browser test observed a non-babble operation in this mode, while sustained 20 TPS remains unproven. See the [adaptation guide](docs/demo-adaptation-guide.md).

Clone and run locally:

    npm ci
    npm run dev

Open the local URL printed by the command. Run type checks, Astro diagnostics, model tests, and the static build check:

    npm run check

For a built-site preview (`npm run build`, then `npm run preview`), Astro serves the project subpath. The local CartPole URL is [http://127.0.0.1:4321/opennars-304-ts-lab/demo.html?game=cartpole](http://127.0.0.1:4321/opennars-304-ts-lab/demo.html?game=cartpole); `/demo.html` at the root returns 404. Browser scripts default to the preview subpath. Set `DEMO_BASE_URL=http://127.0.0.1:4321/` explicitly when testing the root-based development server.
The index loads previews and reaches the terminal with or without a trailing slash on the project path. `terminal.html` is an Astro route; its NARS Worker starts only after navigation.

Upload dist/ to any static host. The Pages command synchronizes the generated tree:

    npm run deploy:pages -- /path/to/ARCJ137442.github.io

See docs/maintainer-guide.md for module boundaries, the new-demo workflow, model contracts, and browser acceptance checks.
See docs/opennars-304-mechanism-analysis.md and docs/demo-adaptation-guide.md for the OpenNARS 3.0.4 mechanism boundary and ONA demo adaptation rationale.
See docs/demo-expansion-plan.md, docs/demo-candidate-survey.md, and docs/original-demo-proposals.md for the next demo batch and original experiment proposals.
See docs/terminology.md for the project's Chinese NARS/Narsese terminology map.
See [One image is worth a thousand words](docs/design-principle-one-image.md) for the pre-release interface rules, and [the Java Lab feature map](docs/java-lab-feature-map.md) for implemented versus planned Launcher counterparts.
The [2026-10-03 Demo handoff](docs/probes/20261003-demo-batch-requirements.md) distinguishes shipped foundations from future functions. An experimental Grid model lives on the `codex/gridworld-foundation-wip` branch; no Grid page is on main.
The demo HUD separates `FPS` (rendering), `TPS` (world ticks), and `RPS` (NARS inference cycles); the collapsed Performance Diagnostics panel exposes sync/async pacing and runtime backlog. See [the runtime pacing plan](docs/demo-runtime-modes-plan.md).
Every current Demo now requests at least 20 TPS. This configuration does not prove a sustained measured rate of 20; check the actual-to-target ratio and RPS, especially in synchronous mode. See [the experiment record](docs/probes/20261003-embodied-operation-adaptation.md) for known limitations.
HUD RPS counts cycles actually completed in an approximately one-second wall-clock window and drops to zero when reasoning makes no progress. Its bar compares against target TPS × cycles per world tick, rather than reporting one fast inference call as sustained throughput.
The five expansion environments report state changes immediately and refresh unchanged state every five ticks; outcome feedback is always sent. This is an explicit Demo input adaptation, not a same-semantics speedup of the reasoner core.

### Source map

- src/pages/: Astro static routes.
- src/components/DemoCard.astro: reusable directory cards.
- src/data/demo-catalog.ts: demo registration and route ID guard.
- src/games/models.ts: pure TypeScript environment and perception/feedback contracts.
- src/demo.ts and src/demo-worker.ts: shared game workspace and NARS Worker control.
- src/microworld/simulation.ts: independent Microworld simulation contract.
- src/microworld/nars-priors.ts: optional Microworld starter knowledge.
- src/pages/terminal.astro and src/app.js: Astro terminal route and Worker interaction.
- scripts/prepare-site.mjs: stages Microworld assets and license texts.
- scripts/check-build.mjs: validates the release tree.

## Interaction contract

- `Enter` submits the current input.
- `Shift+Enter` inserts a newline, so multiple Narsese and `:cycles` commands can be pasted together.
- Lines in one batch are executed in order by one isolated Worker message.
- The input regains focus after inference completes.
- Multiline input and output preserve line breaks.
- On the first or last line, `ArrowUp` and `ArrowDown` recall history.
- `OUTPUT VOLUME` maps to the OpenNARS `0..100` derived-task output threshold.

## Build and test

```bash
npm ci
npm test
npm run check
```

`npm run build` uses Astro to generate the index, terminal, and game pages, then stages Microworld, Workers, sprites, and license texts in `dist/`. The build checks the core source commit and rebuilds the Worker. Requires Node.js 22.19 or newer.

## Rebuild the Worker

By default the build reads the adjacent `OpenNARS-304-ts` checkout. Override it when needed:

```powershell
$env:OPENNARS_TS_ROOT = "C:\path\to\clean\OpenNARS-304-ts"
$env:OPENNARS_NODE_MODULES = "C:\path\to\OpenNARS-304-ts\node_modules"
npm run build:worker
```

The build rejects tracked changes in the core checkout and records the source commit in `public/build-meta.json`.

## Deploy to GitHub Pages

```bash
npm run deploy:pages -- /path/to/ARCJ137442.github.io
```

The deployment script synchronizes the full `dist/` tree to `ARCJ137442.github.io/opennars-304-ts-lab/`, including Astro's `_astro/` assets. Review, commit, and push the Pages repository separately.
