export type ReasonerObservatoryElements = {
  operation: HTMLElement;
  source: HTMLElement;
  detail?: HTMLElement;
  narTime?: HTMLElement;
  sensorGrid: HTMLElement;
  sensorFocus?: HTMLElement;
  rewardState?: HTMLElement;
  goodCount?: HTMLElement;
  badCount?: HTMLElement;
  foodRatio?: HTMLElement;
  ratioFill?: HTMLElement;
  stepCount?: HTMLElement;
};

export type ReasonerObservatoryState = {
  operation: string;
  source: string;
  detail: string;
  narTime: string;
  sensors: readonly number[];
  rewardType?: "good" | "bad" | null;
  good: number;
  bad: number;
  step: number;
};

const SENSOR_LABELS = ["G1", "G2", "G3", "B1", "B2", "B3"];

export function renderReasonerObservatory(elements: ReasonerObservatoryElements, state: ReasonerObservatoryState): void {
  elements.operation.textContent = state.operation;
  elements.source.textContent = state.source;
  if ("value" in elements.source) (elements.source as HTMLOutputElement).value = state.source;
  if (elements.detail) elements.detail.textContent = state.detail;
  if (elements.narTime) elements.narTime.textContent = `NAR ${state.narTime}`;
  if (elements.stepCount) {
    elements.stepCount.textContent = String(state.step).padStart(6, "0");
    if ("value" in elements.stepCount) (elements.stepCount as HTMLOutputElement).value = elements.stepCount.textContent;
  }
  const maxSensor = Math.max(...state.sensors, 0);
  const focusIndex = maxSensor > 0 ? state.sensors.indexOf(maxSensor) : -1;
  if (elements.sensorFocus) elements.sensorFocus.textContent = focusIndex < 0 ? "暂无目标" : `${SENSOR_LABELS[focusIndex]} · ${(maxSensor * 100).toFixed(0)}%`;
  elements.sensorGrid.replaceChildren();
  state.sensors.forEach((value, index) => {
    const cell = document.createElement("span");
    cell.className = `sensor-cell${index >= 3 ? " negative" : ""}${value > 0.1 ? " active" : ""}`;
    cell.style.setProperty("--sensor-level", String(value));
    cell.textContent = `${SENSOR_LABELS[index] ?? `S${index + 1}`} ${(value * 100).toFixed(0)}%`;
    cell.title = `${index >= 3 ? "坏食物" : "好食物"} 感受点 ${(index % 3) + 1}: ${(value * 100).toFixed(0)}%`;
    elements.sensorGrid.append(cell);
  });
  if (elements.rewardState) elements.rewardState.textContent = state.rewardType === "good" ? "+1 满足" : state.rewardType === "bad" ? "-1 满足 / 健康" : state.step > 0 ? "0 / 无碰撞" : "尚无反馈";
  if (elements.goodCount) elements.goodCount.textContent = String(state.good);
  if (elements.badCount) elements.badCount.textContent = String(state.bad);
  const ratio = state.good / Math.max(1, state.bad);
  if (elements.foodRatio) elements.foodRatio.textContent = ratio.toFixed(2);
  if (elements.ratioFill) elements.ratioFill.style.width = `${Math.max(6, Math.min(100, (ratio / (ratio + 1)) * 100))}%`;
}
