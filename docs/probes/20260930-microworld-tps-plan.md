# Microworld TPS alignment probe

## Question

What should the browser Microworld target for a world tick, and how should its rate be compared with the OpenNARS Lab 3.0.4 reference?

## Confirmed reference

- `opennars-lab-3.0.4/src/main/java/org/opennars/lab/microworld/SimNAR.java` calls `frameRate(50)` in `setup()`.
- Its active update path runs `nar.cycles(10)` once per simulation update.
- Therefore the Java host requests a 50 TPS world clock and ten NARS cycles per world tick.

## Implementation decision

- Keep 50 TPS as the browser control ceiling and Java comparison target.
- Start the browser at 20 TPS, the minimum smoothness target requested for this project.
- Compute the HUD TPS bar and ratio from completed environment ticks divided by the selected target. Do not overwrite that value with a second page-level cumulative counter.
- Keep synchronous mode semantics: a world tick commits only after the matching Worker result. A target change is not evidence of achieved performance.
- Schedule synchronous requests against fixed deadlines so NARS latency consumes the current period instead of adding another full period.

## Verification

- Unit test the constants and their ordering.
- Run typecheck, Astro checks, the full Node test suite, build, build-tree checks, and browser smoke.
- Report actual TPS, selected target, actual/target ratio, RPS, latency, concepts, and RSS separately. A clean browser run is required before claiming a performance result.
