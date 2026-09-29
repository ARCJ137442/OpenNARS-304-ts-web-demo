# OpenNARS 3.0.4 TypeScript Web Terminal

[简体中文](README.md)

This repository contains the standalone browser demo for <https://arcj137442.github.io/opennars-304-ts/>. The GitHub Pages repository stores only generated files under `opennars-304-ts/`.

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

`npm run build` assembles the web shell and the generated Worker into `dist/`.

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

The deployment script writes only the seven known files in `ARCJ137442.github.io/opennars-304-ts/`. Review, commit, and push the Pages repository separately.
