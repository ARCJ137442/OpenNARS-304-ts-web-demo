# OpenNARS 3.0.4 TypeScript Demo Lab

[简体中文](README.md)

This repository contains the standalone browser demo for <https://arcj137442.github.io/opennars-304-ts-lab/>. The GitHub Pages repository stores only generated files under `opennars-304-ts-lab/`.

## Demo Lab

The index links Microworld, Pong, Alien, BandRobot, CartPole, Hunt, TicTacToe, Shot, Grid2D TestChamber, and FighterPlane. Each environment uses the same NARS Worker controls and activity monitor while keeping its model independent and testable. Astro generates static HTML, CSS, and JavaScript; no Astro runtime or backend is shipped.

Clone and run locally:

    npm ci
    npm run dev

Open the local URL printed by the command. Run type checks, Astro diagnostics, model tests, and the static build check:

    npm run check

Upload dist/ to any static host. The Pages command synchronizes the generated tree:

    npm run deploy:pages -- /path/to/ARCJ137442.github.io

See docs/maintainer-guide.md for module boundaries, the new-demo workflow, model contracts, and browser acceptance checks.
See docs/opennars-304-mechanism-analysis.md and docs/demo-adaptation-guide.md for the OpenNARS 3.0.4 mechanism boundary and ONA demo adaptation rationale.
See docs/demo-expansion-plan.md, docs/demo-candidate-survey.md, and docs/original-demo-proposals.md for the next demo batch and original experiment proposals.

### Source map

- src/pages/: Astro static routes.
- src/components/DemoCard.astro: reusable directory cards.
- src/data/demo-catalog.ts: demo registration and route ID guard.
- src/games/models.ts: pure TypeScript environment and perception/feedback contracts.
- src/demo.ts and src/demo-worker.ts: shared game workspace and NARS Worker control.
- src/microworld/simulation.ts: independent Microworld simulation contract.
- scripts/prepare-site.mjs: stages static assets and standalone terminal/Microworld pages.
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

`npm run build` uses Astro to generate the static index and game page, then stages the terminal, Microworld, Workers, sprites, and license texts in `dist/`. A web-shell change does not require rebuilding the OpenNARS Worker. Requires Node.js 22.19 or newer.

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
