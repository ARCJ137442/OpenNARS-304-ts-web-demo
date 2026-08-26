import assert from "node:assert/strict";
import test from "node:test";

import {
  canNavigateHistory,
  formatCommandEcho,
  normalizeCommandLines,
  normalizeVolume,
  shouldSubmitFromKeydown,
} from "../src/input-behavior.js";

test("normalizes a pasted CRLF command batch without empty commands", () => {
  assert.deepEqual(
    normalizeCommandLines("  <bird --> animal>.\r\n\r\n<bird --> animal>?\r\n:cycles 10  "),
    ["<bird --> animal>.", "<bird --> animal>?", ":cycles 10"],
  );
});

test("normalizes UI volume to OpenNARS' 0..100 output range", () => {
  assert.equal(normalizeVolume("35"), 35);
  assert.equal(normalizeVolume(-4), 0);
  assert.equal(normalizeVolume(108), 100);
  assert.equal(normalizeVolume("not-a-number"), null);
});

test("renders a multiline terminal echo with continuation prompts", () => {
  assert.equal(
    formatCommandEcho(["<bird --> animal>.", ":cycles 10"]),
    "nars> <bird --> animal>.\n ...> :cycles 10",
  );
});

test("Enter submits while Shift+Enter and IME composition preserve editing", () => {
  assert.equal(shouldSubmitFromKeydown({ key: "Enter", shiftKey: false, isComposing: false }), true);
  assert.equal(shouldSubmitFromKeydown({ key: "Enter", shiftKey: true, isComposing: false }), false);
  assert.equal(shouldSubmitFromKeydown({ key: "Enter", shiftKey: false, isComposing: true }), false);
});

test("multiline history navigation only takes over at the first or last line", () => {
  const value = "first\nsecond";
  assert.equal(canNavigateHistory("ArrowUp", value, 2, 2), true);
  assert.equal(canNavigateHistory("ArrowUp", value, 8, 8), false);
  assert.equal(canNavigateHistory("ArrowDown", value, 2, 2), false);
  assert.equal(canNavigateHistory("ArrowDown", value, value.length, value.length), true);
});
