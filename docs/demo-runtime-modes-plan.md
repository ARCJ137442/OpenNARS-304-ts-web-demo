# Demo Runtime Modes

## Scope

The Demo Lab exposes three separate rates: FPS is the canvas render rate, TPS is the environment tick rate, and RPS is the NARS inference rate. Each rate is computed from completed events and is shown with the same compact HUD treatment.

The default mode is synchronous: an environment tick is committed only after its matching Worker `step-complete` event. Asynchronous mode targets the selected TPS independently; NARS requests may be pending while the environment continues. A delayed action is applied to the next available world tick, never retroactively; replacing an unconsumed delayed action increments the late-action counter.

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
