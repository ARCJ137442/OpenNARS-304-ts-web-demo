# NARS 3.0.4 Demo Lab implementation plan

## Goal

Create a static H5 Lab that indexes the existing terminal and a coherent NARS 3.0.4 demo series. Keep each environment model independent while sharing browser packaging, lifecycle controls, NARS Worker contracts, operation logs, and deployment. Initial series: classic OpenNARS Pong, SimNAR Microworld, plus the short ONA/NARust-o Alien, BandRobot, CartPole, and Hunt perception/action examples.

## Source facts

- Reference implementation: `opennars-lab-3.0.4/src/main/java/org/opennars/lab/microworld/SimNAR.java`.
- Tessergon commented reference: `【虫脑Microworld Demo 注释版 by Tessergon】SimNAR.java`.
- Active mode is 2D (`hamLib.Init(false)`); the camera/3D implementation is not active in the shipped setup.
- Initial world is 800x600, one agent, five good food objects, and five bad food objects; padding is 80 px.
- Agent perception uses six sectors (3 positive/good, 3 negative/bad), 120-degree total view angle, and a 160 px sensing distance.
- Per environment step, the NARS bridge submits changing sensor facts above 0.1, refreshes repeated sensor facts every five steps, activates goals every two steps (healthy every tenth step, satisfied otherwise), submits reward feedback, and executes 10 NARS cycles.
- Rewards: good food submits satisfied=true; bad food submits satisfied=false and healthy=false. Health is reasserted every 20 steps after 200 steps without bad food.
- Registered operations are `^Forward`, `^Left`, and `^Right`. Babble occurs with probability 0.1 when NARS emitted no action; one of four values is sampled, with zero meaning no movement.
- Physics: velocity drag 0.9, forward acceleration +10 capped at 15, turns +/-0.5 radians, wraparound edges, bad food rotates.
- HSom/SOM code exists but its active instantiation is commented out. It is not presented as part of the default Microworld behavior.
- The original page uses `agent.png`, `food.png`, and `fire.png`. These assets are GPL-covered and will retain their upstream attribution and license.
- The OpenNARS Lab classic `Pong.java` has a paddle agent, falling ball, left/right operators, relative ball-position sensing near the paddle, `good` goals, collision/miss feedback, and ten NARS cycles per environment step.
- NARust-o `examples/_games` includes Alien (left/right/shoot), BandRobot (left/right/pick/drop), CartPole (left/right balance), Hunt (four-direction pursuit), multiple Pong variants, Giving, Evolution of Trust, and a larger Shot series. NARust-o is MIT OR Apache-2.0 and contains an ONA attribution license; ports must preserve attribution and distinguish new OpenNARS behavior from ONA-specific interfaces.

## Initial proposal (superseded)

- `src/microworld/simulation.js`: pure world state, sensing, collision, rewards, physics, and wraparound.
- `src/demo-worker.ts`: reusable NAR instance lifecycle, action operator plugins, bounded inference batches, and structured operation/log events for registered demos.
- `src/games/*.ts`: independent deterministic environment models, sensors, rewards, and render snapshots.
- `src/game-shell.js`: shared Canvas lifecycle, pause/resume, single-step, reset, speed, keyboard input, logs, and NARS monitoring.
- `src/lab.html` / `src/lab.css` / `src/lab.js`: unified Lab index and route catalog.
- `src/microworld.html` / `src/microworld.css`: Microworld teaching view and original GPL sprites.
- `src/demo.html`: shared H5 game surface selected by a registered demo id.
- Build output includes the page, worker, original sprites, and GPL notice; deploy remains limited to the demo directory.

## Current implementation boundaries

- src/pages/index.astro generates the Lab index from src/data/demo-catalog.ts using reusable src/components/DemoCard.astro cards.
- src/pages/demo.astro is the shared game workspace, selected by the game query parameter.
- src/layouts/SiteLayout.astro provides the static document shell. Astro emits plain HTML, CSS, and JavaScript; no Astro runtime is shipped to the browser.
- src/games/models.ts owns deterministic game state, Narsese sensing and feedback, action transitions, and reset contracts. Keep browser APIs and Canvas out of this module.
- src/data/demo-catalog.ts owns presentation metadata and routes for every game. Its ID guard is shared by the index and runtime.
- src/demo.ts owns shared workspace controls, NARS Worker lifecycle, metrics, operation logs, manual controls, and per-game Canvas renderers.
- src/demo-worker.ts owns reusable NAR lifecycle, action operator plugins, bounded inference batches, and structured operation/log events.
- src/microworld/simulation.ts owns pure world state, sensing, collision, rewards, physics, and wraparound.
- src/microworld.ts, src/microworld.html, and src/microworld.css own the standalone teaching view and original GPL sprites. The terminal remains a standalone static entry.
- scripts/prepare-site.mjs stages standalone pages, licenses, and sprites in Astro's public directory. Astro builds the Lab pages; scripts/check-build.mjs verifies the complete deploy tree.
- scripts/deploy-pages.mjs copies the checked static tree, including _astro assets, to the dedicated Pages subdirectory.

## Adding a game

1. Add a DemoId member and discriminated state type in src/games/models.ts. Add its definition, initial state, sensor/goal/feedback encoding, action transition, manual-control transition, and reset behavior.
2. Update src/demo-worker.ts only when the environment introduces a new NARS operator contract. Keep it on the shared worker message protocol.
3. Add one DemoCatalogEntry to src/data/demo-catalog.ts with title, summary, route, preview key, source URL, and license attribution. The catalog test requires each model ID to have exactly one route.
4. Add a renderer and state metrics/manual-control mapping in src/demo.ts; add a lightweight animated preview renderer in src/lab.ts.
5. Add direct model tests for initial state, sensor/goal input, legal action, outcome/feedback, and reset. Run npm run check.
6. Run npm run dev, open the game route, and verify Worker ready, inference, pause, single-step, reset, manual controls, operation log, and canvas at desktop and mobile widths.

The source link and license belong to the individual demo definition and its workspace disclosure. Catalog ordering communicates no preference about upstream origin.

## Verification

- Pure model tests cover angle wrapping, sensor sectors, collision rewards, physics, and reset.
- Each game contract tests initial state, sensor encoding, legal actions, collision/round outcomes, reset, and score accounting.
- Demo checks verify all generated files and worker metadata.
- Real-browser smoke verifies Worker online, pause/resume, one-step, reset, operation log, and Narsese/NAR activity.
- Keep inference off the animation frame; issue one 10-cycle NARS request per scheduled simulation step so pause takes effect at the next completed step.

## License and provenance

The original SimNAR and Pong sources explicitly identify GPL-3.0-or-later. The commented SimNAR reference says it adds explanation to the GPL source. NARust-o is MIT OR Apache-2.0 and includes ONA attribution. Adapted demo modules and retained source assets will carry per-demo provenance and the applicable license; the core package's MIT license is not changed by the demo modules. Generated Pages files include the notices and corresponding demo source remains in this repository.

## Agent workflow disclosure

Implementation author: GPT-6 Sol High. Work follows the repository instructions, the inspected original and annotated SimNAR contracts, responsibility-level implementation, focused model tests, demo build/check, and real-browser verification. Agent output is disclosed as AI-authored; no npm publication or repository visibility change is part of this task.
