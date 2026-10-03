import assert from "node:assert/strict";
import test from "node:test";

import { RuntimeTelemetryView } from "../src/ui/runtime-telemetry.ts";

test("RPS counts completed cycles per wall-clock second and clears after an idle window", () => {
  const previousWindow = (globalThis as { window?: unknown }).window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { setInterval: () => 1, clearInterval: () => {} },
  });
  const element = () => ({
    value: "", textContent: "", title: "", dataset: {} as Record<string, string>,
    style: { setProperty: (_name: string, _value: string) => {} },
  });
  const elements = {
    fps: element(), tps: element(), tpsTarget: element(), tpsRatio: element(), rps: element(),
    fpsBar: element(), tpsBar: element(), rpsBar: element(), pageMemory: element(),
    concepts: element(), taskBags: element(),
  };
  const telemetry = new RuntimeTelemetryView(elements as unknown as ConstructorParameters<typeof RuntimeTelemetryView>[0]);
  try {
    telemetry.resetRates();
    telemetry.setTargetTps(5);
    telemetry.setCyclesPerTick(10);
    telemetry.inference(10);
    const start = performance.now();
    telemetry.frame(start + 1010);
    assert.ok(Number.parseFloat(elements.rps.value) > 9 && Number.parseFloat(elements.rps.value) <= 10);
    assert.match(elements.rps.title, /目标 50\.0 RPS/);
    assert.equal(elements.rps.dataset.rate, "lag");

    telemetry.frame(start + 2020);
    assert.equal(elements.rps.value, "0.0 RPS");
    telemetry.resetRates();
    assert.equal(elements.rps.value, "-- RPS");
  } finally {
    telemetry.dispose();
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
  }
});
