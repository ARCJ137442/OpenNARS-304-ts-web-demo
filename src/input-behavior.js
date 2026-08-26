export function normalizeCommandLines(rawValue) {
  return String(rawValue ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function formatCommandEcho(lines) {
  return lines
    .map((line, index) => `${index === 0 ? "nars>" : " ...>"} ${line}`)
    .join("\n");
}

export function shouldSubmitFromKeydown(event) {
  return event.key === "Enter" && !event.shiftKey && !event.isComposing;
}

export function normalizeVolume(rawValue) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function canNavigateHistory(key, value, selectionStart, selectionEnd) {
  if (selectionStart !== selectionEnd) return false;
  const text = String(value ?? "");
  if (!text.includes("\n")) return key === "ArrowUp" || key === "ArrowDown";
  if (key === "ArrowUp") return !text.slice(0, selectionStart).includes("\n");
  if (key === "ArrowDown") return !text.slice(selectionEnd).includes("\n");
  return false;
}
