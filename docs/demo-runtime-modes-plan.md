# Demo Runtime Modes

## Scope

The Demo Lab exposes three separate rates: FPS is the canvas render rate, TPS is the environment tick rate, and RPS is the NARS inference rate. Each rate is computed from completed events and is shown with the same compact HUD treatment.

The default mode is synchronous: an environment tick is committed only after its matching Worker `step-complete` event. Asynchronous mode targets the selected TPS independently; NARS requests may be pending while the environment continues. A delayed action is applied to the next available world tick, never retroactively; replacing an unconsumed delayed action increments the late-action counter.

Microworld pacing follows the active Java `SimNAR` reference: `setup()` requests `frameRate(50)` and each environment update runs `nar.cycles(10)`. The browser control exposes a 50 TPS ceiling and starts at a 20 TPS smoothness floor. The 20 TPS floor is a product usability threshold; it is not evidence that the TypeScript reasoner currently sustains the Java target.

Synchronous scheduling uses fixed deadlines. When a Worker result arrives, the next deadline advances from the previous deadline and is clamped to the current time if inference overran it. This matches a fixed world clock and avoids adding a full target period after every NARS response.

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
