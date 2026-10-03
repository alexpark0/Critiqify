import assert from "node:assert/strict";
import test from "node:test";
import { finiteDuration, formatClock, splitTimestamps } from "./time.js";

test("formatClock hides unknown durations and keeps media timestamps short", () => {
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(11), "0:11");
  assert.equal(formatClock(65.8), "1:05");
  assert.equal(formatClock(3723), "1:02:03");
  assert.equal(formatClock(Infinity), "--:--");
  assert.equal(formatClock(Number.NaN), "--:--");
});

test("splitTimestamps finds critique moments without treating scores as times", () => {
  const parts = splitTimestamps(
    "You rush from about 0:11 to 0:19, then recover at 1:02:03. Score 7/10.",
  );
  assert.deepEqual(
    parts.filter((part) => part.type === "time").map((part) => [part.value, part.seconds]),
    [
      ["0:11", 11],
      ["0:19", 19],
      ["1:02:03", 3723],
    ],
  );
  assert.equal(parts.some((part) => part.value.includes("7/10")), true);
});

test("finiteDuration rejects the MediaRecorder Infinity duration", () => {
  assert.equal(finiteDuration(Infinity), false);
  assert.equal(finiteDuration(0), false);
  assert.equal(finiteDuration(12.5), true);
});
