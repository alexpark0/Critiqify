import assert from "node:assert/strict";
import test from "node:test";
import { TELEPROMPTER_CUE, teleprompterView } from "./teleprompter.js";

test("teleprompter banner keeps the cue, question, and timer together", () => {
  const idle = teleprompterView();
  assert.equal(idle.cue, TELEPROMPTER_CUE);
  assert.equal(idle.cue, "Keep eyes near camera");
  assert.equal(idle.hasQuestion, false);
  assert.match(idle.question, /look just above the lens/);
  assert.equal(idle.generateLabel, "Generate sample question");
  assert.equal(idle.timerMode, "idle");
  assert.equal(idle.timerText, "0:00");
  assert.equal(idle.timerLabel, "Timer 0:00");

  const ready = teleprompterView({
    question: "  Tell me about a bug you fixed.  ",
    mode: "playback",
    playbackSeconds: 65,
  });
  assert.equal(ready.hasQuestion, true);
  assert.equal(ready.question, "Tell me about a bug you fixed.");
  assert.equal(ready.generateLabel, "New sample question");
  assert.equal(ready.timerMode, "playback");
  assert.equal(ready.timerText, "1:05");
  assert.equal(ready.timerLabel, "Playback 1:05");
});

test("recording mode shows a live timer in the teleprompter", () => {
  const recording = teleprompterView({
    question: "Why this design?",
    mode: "recording",
    elapsedSeconds: 12.4,
  });
  assert.equal(recording.timerMode, "recording");
  assert.equal(recording.timerText, "REC 0:12");
  assert.equal(recording.timerLabel, "Recording 0:12");
});
