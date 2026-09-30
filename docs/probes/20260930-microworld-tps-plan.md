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

## Observed result on `aa64df5`

- `npm run check`: passed; typecheck, Astro diagnostics, 28 Node tests, static build, and build-tree checks all passed.
- `npm run test:browser`: passed; all 10 game pages and Microworld loaded, page errors 0, index workers 0.
- A 10-second development-browser spot sample briefly held around `19.4-20.7 TPS` at a 20 TPS target. This is exploratory, not sustained proof.
- The subsequent 12-second sample exposed workload sensitivity: TPS fell from `15.1` to `0.2`, reported latency rose to `5062 ms`, and concepts grew from `333` to `1243`; the last displayed ratio was `1%`. No RSS API value was captured in that sample.
- Conclusion: fixed-clock scheduling removed the extra post-inference period, but the TS reasoner does not yet sustain the 20 TPS smoothness floor under Microworld's changing workload. Do not claim performance success or Java parity for achieved TPS. The Java source establishes a requested 50 Hz schedule, not a measured sustained runtime TPS benchmark.

## Interpretation and next experiments

The short-lived rate improvement came from two different changes and must not be conflated:

- Sensor de-duplication reduced repeated input work in `74a955b`.
- Fixed-deadline scheduling in `aa64df5` removed the artificial full-period wait after each synchronous Worker response.

Neither change removes the reasoner's state-growth cost. The browser probe reached `333` concepts with a `21 ms` step, then later reached `1243` concepts with a `5062 ms` step. The corresponding Node CartPole workload reached `4900` concepts after 200 ticks, with `1041.603 ms` median and `7129.231 ms` p95 step latency. The dominant current hypothesis is allocation/GC and equality or lookup work that grows with the concept and task bags, rather than Canvas rendering or the timer itself.

TypeScript still has optimization headroom. Java's HotSpot JIT and the translated runtime's Java-shaped compatibility calls are different execution environments; the current slowdown is evidence about this implementation, not a language limit. The next measurements should be isolated and semantics-preserving:

1. Profile one clean Worker run with CPU and heap timelines, recording concept count, input count, step p50/p95, RPS, and RSS at fixed ticks.
2. A/B the hot paths already identified by core evidence: `CompoundTerm.equals`, `javaValueEquals`, Bag equality lookup/removal, UTF-16/string conversion, and short-lived event/log formatting.
3. Test a demo-only low-risk variant with diagnostic snapshots and UI log formatting decimated while preserving every NARS input, operation, and feedback event.
4. For each candidate, rerun the same M2, markerless parity sample, core M3 sample, and Microworld workload. Keep a change only when functional parity holds and the measured target metric improves; three consecutive sub-5% rounds close the optimization streak.

The Java `frameRate(50)` call remains a requested scheduling rate. A valid Java-vs-TS TPS comparison still requires a headless Java run and the same fixed sensor/goal/reward sequence; the current Java source alone does not provide a sustained measured TPS.
