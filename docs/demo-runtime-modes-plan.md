# Demo Runtime Modes

## Scope

The Demo Lab exposes three separate rates: FPS is the canvas render rate, TPS is the environment tick rate, and RPS is the NARS inference rate. Each rate is computed from completed events and is shown with the same compact HUD treatment.

The default mode is synchronous: an environment tick is committed only after its matching Worker `step-complete` event. Asynchronous mode targets the selected TPS independently; NARS requests may be pending while the environment continues. A delayed action is applied to the next available world tick, never retroactively; replacing an unconsumed delayed action increments the late-action counter.

Microworld pacing follows the active Java `SimNAR` reference: `setup()` requests `frameRate(50)` and each environment update runs `nar.cycles(10)`. The browser control exposes a 50 TPS ceiling and starts at a 20 TPS smoothness floor. The 20 TPS floor is a product usability threshold; it is not evidence that the TypeScript reasoner currently sustains the Java target.

Synchronous scheduling uses fixed deadlines. When a Worker result arrives, the next deadline advances from the previous deadline and is clamped to the current time if inference overran it. This matches a fixed world clock and avoids adding a full target period after every NARS response.

2026-10-02 audit: Microworld followed this rule, while the shared multi-game page used `performance.now() + period` after every synchronous Worker response. The new `src/world-clock.ts` centralizes the rule for both pages. Before accepting a TPS gain, compare the same game, seed, cycles, browser and observation window; a timing rule fix is not evidence that the reasoner itself became faster.

Both pages now accept an optional positive 32-bit `?seed=` value for reproducible world and NARS initialization. Without it, they retain a random new experiment seed. A performance comparison must record the URL seed, target TPS, NARS cycles, mode and observation duration.

The 2026-10-02 browser smoke exposed a release-build trap: `astro build` had succeeded while copying an older `44e937b` Worker bundle from `public`. `npm run dev` and `npm run build` now rebuild the Worker first, and `scripts/check-build.mjs` rejects a bundle whose `sourceCommit` differs from the current core HEAD. This keeps a freshly built page from silently exercising an older reasoner.

The Worker build no longer resolves obsolete `jree-host-adapter.ts` or `jree-compat.ts` aliases. Current core imports resolve through the native host adapters; the new build and real-browser smoke must confirm those aliases were dead before this removal is accepted.

The multi-game target control now allows 20 TPS (previously capped at 12), so its target is not artificially below the stated performance aspiration. Raising a selectable target does not assert that synchronous actual TPS can reach it.

`scripts/browser-rate-benchmark.mjs` records actual world steps, wall-clock RPS, active-inference RPS, p95 inference latency, concept growth, non-babble operations, HUD readings and page errors from a fixed URL seed. Run it only when core long tests are idle so CPU contention does not contaminate the comparison.

After the first core candidate's M1′ finished, a Chrome 30-second probe with the rebuilt core Worker (`ba45979`, production source `17b5fb2`) measured CartPole sync/5 cycles/target 20 TPS at `0.532 TPS`, `2.661 wall RPS`, with concepts reaching 2284. Microworld sync/10 cycles/target 20 TPS averaged `11.275 TPS` and `112.753 wall RPS`; its first three five-second windows were `19.77/19.55/19.34 TPS`, then `7.39/1.40/0.20 TPS`, with concepts reaching 1949. The raw JSON is in `test-results/{cartpole,microworld}-sync-bag-clock-20261002.json` and records `demoTrackedSourceClean=false`; it is a diagnostic, not release evidence. FPS stayed near 56 while TPS collapsed. Fixed deadlines remove an avoidable extra wait but do not cure inference growth; the next core Bag equality candidate must be rebuilt and measured separately after its M1′ gate.

The next core Worker, source commit `07aceff` (production code `41070c1`), passed the static build, metadata-source check, 32/32 Demo tests and ten-game real Chrome smoke. With the same Chrome 154, seed `3040304`, 30-second window and sync target 20 TPS, Microworld/10 cycles averaged `11.520 TPS` and `115.197 wall RPS`; its six five-second windows were `19.99/20.18/19.39/7.18/2.00/0.40 TPS`, concepts reached 2180, and the final-window p95 inference was `3178.6 ms`. CartPole/5 cycles averaged `0.732 TPS` and `3.659 wall RPS`, concepts reached 3399, with final-window `0.399 TPS` and p95 `2917.2 ms`. Neither sample showed a NARS non-babble operation. The raw JSON is `test-results/{microworld,cartpole}-sync-bag-term-20261002.json`; `demoTrackedSourceClean=false` because the Demo scheduler/build/benchmark changes remain uncommitted. This is diagnostic evidence that the Bag fast path improves a fixed-input CPU benchmark but does not achieve sustained browser TPS. The next experiment is a CPU profile on this core; do not release on these performance results alone.

After building the site, start `npm run preview` and run, for example, `node scripts/browser-rate-benchmark.mjs --game cartpole --seed 3040304 --mode sync --target-tps 20 --cycles 5 --duration-ms 60000 --base-url http://127.0.0.1:4321/opennars-304-ts-lab/ --output test-results/cartpole-sync-60s.json`. Pass options to `node` directly: on this Windows/npm installation, `npm run ... -- --game ...` consumed the option names and ran the wrong defaults. The JSON includes five-second windows to expose late TPS/RPS collapse that an overall mean can hide. `wallRps` counts completed NARS cycles per wall second; `activeRps` divides by Worker inference time only. Browser `pageHeapBytes` is page heap, not Worker memory or process RSS. A Worker fault or page exception fails the benchmark command.

## State Contract

- `mode`: `sync` or `async`, default `sync`.
- `pending`: count of Worker steps in flight.
- `backlog`: Worker steps in flight and, where available, world ticks waiting for an inference result in async mode.
- `lateActions`: delayed actions replaced before they were consumed; no action is written to a historical world tick.
- FPS samples `requestAnimationFrame` frames; TPS samples committed environment ticks; RPS samples `cycles / elapsedMs * 1000` for completed Worker steps.
- The canvas HUD always exposes FPS/TPS/RPS. The collapsible performance diagnostics panel additionally exposes mode, page memory, reasoner bags, latency, queue/backlog, and late-action counters where the host has them.

## Acceptance

- Both modes are selectable without starting a second Worker.
- Sync mode never advances the model before `step-complete`.
- Async mode continues environment ticks while a Worker step is pending and applies the newest completed action on a future tick.
- FPS, TPS and RPS remain visible together on desktop and mobile, with a value and color-coded progress bar.
- Browser smoke checks mode switching, visible metrics, pause/single-step, and absence of index-page Workers.

## Performance Gate

RPS is cycles per second, not completed requests per second. The first optimization target is a measured steady-state RPS of at least `1.0` on the supported PC fixture at the default cycles setting. Async mode may keep TPS responsive below that threshold, but it cannot count as an RPS improvement.

## Optimization Convergence Rule

For each Demo performance round, compare the same browser, seed, mode, target TPS, cycles, duration, and workload. Record actual TPS, `actual TPS / target TPS`, RPS, p95 step latency, concept count, and RSS. A round with a measured improvement above 5% requires another optimization attempt. Stop only after three consecutive accepted rounds each improve every required primary metric by less than 5%; a regression or a failed M1/M2 gate resets the streak.

Round 1 (`74a955b`): Microworld sensor facts changed from a single overwritten last value to a six-channel set. A 20-second PC browser run reached `4.5 TPS / 5.0 target = 91%`, `847.5 RPS`, and `601` concepts; previous observation was approximately `0.3 TPS` with a growing concept bag. This round is a material improvement and does not close the convergence rule. The target has since been corrected to the Java-aligned 50 TPS ceiling with a 20 TPS default; the earlier observation is historical and not comparable to the corrected target.
