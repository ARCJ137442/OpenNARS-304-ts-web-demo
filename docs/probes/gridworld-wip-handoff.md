# Grid Microworld WIP branch handoff

Branch: `codex/gridworld-foundation-wip`, based on Demo `7612d9b`. This branch is an **unfinished optional foundation**, separate from the buildable `main` midterm checkpoint. Do not deploy its draft page.

- `src/gridworld/model.ts`: square (4-neighbor), alternating up/down triangle (3-neighbor), and hexagon (6-neighbor) toroidal movement; left/right turns, deterministic food, six-channel sensors, signed reward.
- `src/gridworld/render.ts`: Canvas polygon/food/agent renderer; not yet visually verified and may need caching of layout geometry before a long-running demo.
- `test/gridworld-model.test.ts`: 9/9 direct tests pass for neighbors, wrap, rotation, deterministic food, sensor and reward.
- `docs/probes/gridworld-page-draft.astro`: an unshipped interface sketch. It imports `../gridworld.ts`, which **does not exist**. Keep it outside `src/pages/` until a real Worker controller is implemented and tested.

Next Agent: read Core spec 046 and Demo `docs/probes/20261003-grid-microworld.md`; build the controller with the existing Microworld Worker protocol, review topology geometry and sensor semantics, then promote the page only after browser proof for all three grids. Do not call this branch a completed Demo or use it to satisfy release gates.
