# Demo Lab Maintainer Guide

This guide describes the repository structure and the supported way to add an environment without duplicating the page shell or NARS lifecycle.

## Runtime shape

The site has no server-side runtime:

    Astro pages and reusable components
                 |
                 v
    static HTML + CSS + browser TypeScript bundles
                 |
          +------+------+
          |             |
       NARS Worker   game model
          |             |
          +-- events ---+--> shared monitor and Canvas view

Astro owns page composition and static output. Environment models are plain TypeScript and can be tested in Node without a browser. The Worker owns the OpenNARS instance and operator plugins. The game page owns browser controls, rendering, logs, and scheduling. Microworld has its own model and page because its interaction and teaching surface differ from the discrete games.

## Source map

- src/pages/index.astro: Lab index.
- src/pages/demo.astro: shared query-selected workspace for the ten game environments.
- src/layouts/SiteLayout.astro: shared page title, favicon, and social metadata.
- src/components/DemoCard.astro: shared directory card.
- src/data/demo-catalog.ts: demo titles, summaries, links, source labels, preview keys, and ID validation.
- src/games/models.ts and src/games/expansion-models.ts: game identifiers, discriminated state types, Narsese input generation, transitions, and reset.
- src/games/perception-cadence.ts: expansion-world event framing; changed beliefs/goals are immediate, stable ones refresh every five ticks after a five-tick warmup, and outcome feedback is never filtered.
- src/demo.ts: browser-side workspace lifecycle, worker messages, metrics, controls, activity log, and Canvas drawing.
- src/demo-worker.ts: NARS instance lifecycle, operator registration, Narsese submission, bounded cycles, and structured events.
- src/games/worlds/tictactoe.ts, shot.ts, testchamber.ts, fighterplane.ts and src/games/expansion/worlds/echo-relay.ts: current expansion batch model contracts.
- src/diagnostics/reasoner-snapshot.ts: constant-time concept and task-bag counts returned by the Worker.
- src/ui/runtime-telemetry.ts: FPS, world TPS, wall-clock completed-cycle RPS, browser-supported page-memory estimates, and the diagnostics panel view.
- src/lab.ts: animated directory previews.
- src/microworld/simulation.ts: deterministic Microworld state and simulation rules.
- src/microworld.ts: Microworld browser presentation and Worker client.
- src/microworld-worker.ts: Microworld NARS adapter.
- src/microworld/nars-priors.ts: optional, explicitly disclosed starter knowledge; classic blank mode remains available.
- src/pages/terminal.astro and src/app.js: Astro terminal route and browser Worker client; the old standalone terminal HTML copy has been removed.
- scripts/prepare-site.mjs: stages the Microworld page, sprite files, and license texts for Astro.
- scripts/check-build.mjs: asserts required pages, worker bundles, licenses, metadata, assets, and Astro output exist.
- scripts/deploy-pages.mjs: builds, verifies, and copies the output tree to the Pages repository.

## Add a game

1. Define a new string ID and a state type discriminated by that ID in src/games/models.ts. Keep all mutable world state in that type. Avoid DOM, Canvas, timers, and Worker APIs here.
2. Add its immutable definition to DEMO_DEFINITIONS. Specify NARS action names, default cycles and Babble, plus upstream source URL and license.
3. Add initial state, Narsese beliefs/goals/feedback, action transition, manual-control behavior, and reset behavior to the corresponding model functions. Keep physics deterministic for a given seed. If the world has stable state, decide whether change-based event framing is appropriate; do not silently drop outcome feedback or present an input-cadence change as a same-semantics reasoner speedup.
4. Add exactly one catalog item to src/data/demo-catalog.ts. Its game ID, route, and preview ID must agree. Add a catalog contract test when changing this mapping.
5. Add the game renderer, metrics and manual controls to src/demo.ts. Add its directory preview to src/lab.ts. Keep layout and Worker message handling shared.
6. Add model tests for initial values, sensor/goal terms, each meaningful action, collision or terminal outcome, feedback sent to NARS, deterministic reset, and bounds.
7. Run npm run check. Then run npm run dev and verify the route in a browser: Worker online, inference progress, pause/resume, single-step, reset, manual control, operation result, logs, and a visible canvas. Turn Babble off and verify an actual `source=NARS` operation changes the world; a counterfactual or success-state check is stronger than counting EXE alone. Check desktop and narrow mobile layout.

Run npm run test:browser when a local Chromium/Chrome installation is available. The smoke suite checks slashless and slash-terminated index paths, sprite pixels, terminal judgment/goal/cycle/reset and narrow-screen input, HUD layout stability, ten game pages, and Microworld. The index starts no NARS Worker.
For a same-input reasoner A/B, `scripts/profile-demo-worker.mjs --bundle <built-worker.js>` and `scripts/profile-microworld-worker.mjs --bundle <built-worker.js>` execute a specific byte-identifiable Worker bundle with the TypeScript world model. Record the bundle SHA, seed, cycles, babble, final concepts, actions, and RSS; this Node harness does not replace the real-browser rate gate.

If the environment needs an operator (操作算子) not already registered, add it to src/demo-worker.ts and verify its actual EXECUTION event; a button or predicted action alone does not prove the NARS operation ran. Preloaded causal rules must be disclosed as starter knowledge, not described as rules learned from scratch.

## Change and release flow

Install with npm ci. A normal source change uses npm run check; npm run build rebuilds the Worker bundles and records the exact core commit. scripts/build-opennars-worker.mjs rejects tracked core changes by default. Never hand-edit generated bundles.

The static build is dist/. Inspect the generated pages, _astro assets, worker bundles, source metadata, and license files before publishing. Run the Pages sync only against the dedicated site repository path, then review its diff before committing it.

Each demo must identify its upstream source and applicable license inside its own details panel. Preserve OpenNARS GPL attribution for Microworld and Pong, and NARust-o/ONA attribution for the sensorimotor ports. The TypeScript core package's MIT license is a separate component.
