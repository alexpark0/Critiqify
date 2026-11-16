import assert from "node:assert/strict";
import test from "node:test";
import {
  attachSpeechRecognition,
  cadenceEvidence,
  cueFromFinalResult,
  fillerHits,
  normalizeCues,
  renderTranscriptState,
  speechRecognitionCtor,
} from "./liveTranscript.js";

test("final captions become trimmed cues and blank audio is dropped", () => {
  assert.deepEqual(cueFromFinalResult("  um I checked the logs  ", 2.4), {
    seconds: 2.4,
    text: "um I checked the logs",
  });
  assert.equal(cueFromFinalResult("   ", 1), null);
  assert.equal(cueFromFinalResult("hello", Number.NaN), null);
});

test("normalizeCues sorts phrases and drops ones without text or time", () => {
  const cues = normalizeCues([
    { seconds: 8, text: "  then the fix  " },
    { seconds: -1, text: "nope" },
    { text: "missing time" },
    { seconds: 1, text: "I checked the logs" },
  ]);
  assert.deepEqual(cues, [
    { seconds: 1, text: "I checked the logs" },
    { seconds: 8, text: "then the fix" },
  ]);
  assert.deepEqual(normalizeCues(null), []);
});

test("the Jev state includes the practice question and m:ss stamps", () => {
  const state = renderTranscriptState(
    [{ seconds: 8, text: "um I checked the logs" }],
    " Tell me about a bug. ",
  );
  assert.match(state, /Practice question:\nTell me about a bug\./);
  assert.match(state, /\[0:08\] um I checked the logs/);
  const bare = renderTranscriptState([{ seconds: 0, text: "Hello" }], "  ");
  assert.match(bare, /No practice question was provided/);
  assert.match(bare, /\[0:00\] Hello/);
});

test("filler hits cite um and you know, not the word likely", () => {
  const hits = fillerHits([
    { seconds: 2, text: "um I was likely done, you know" },
    { seconds: 9, text: "the guard shipped" },
  ]);
  assert.deepEqual(
    hits.map((hit) => [hit.word, hit.timestamp]),
    [
      ["um", "0:02"],
      ["you know", "0:02"],
    ],
  );
});

test("cadence evidence cites a long gap and a crowded phrase", () => {
  const evidence = cadenceEvidence([
    { seconds: 1, text: "I checked the logs" },
    { seconds: 6, text: "then I waited" },
    {
      seconds: 7,
      text: "I restarted the service and added a guard and shipped the fix and told the team",
    },
    { seconds: 8, text: "that was the close" },
  ]);
  assert.equal(evidence.pauses[0].timestamp, "0:06");
  assert.ok(evidence.pauses[0].gap >= 3.5);
  assert.equal(evidence.rushes[0].timestamp, "0:07");
});

test("speech recognition keeps one clock across restarts and ignores interim text", () => {
  const cues = [];
  const notes = [];
  let now = 1_000;
  const recognition = {
    startCount: 0,
    stopCount: 0,
    start() {
      this.startCount += 1;
    },
    stop() {
      this.stopCount += 1;
      this.onend?.();
    },
  };
  let recording = true;
  const session = attachSpeechRecognition(recognition, {
    onCue: (cue) => cues.push(cue),
    onStatus: (note) => notes.push(note),
    shouldRestart: () => recording,
    now: () => now,
  });
  assert.equal(speechRecognitionCtor({ webkitSpeechRecognition: function Webkit() {} }).name, "Webkit");

  session.start();
  now = 3_500;
  recognition.onresult({
    resultIndex: 0,
    results: [
      { isFinal: false, 0: { transcript: "um" } },
      { isFinal: true, 0: { transcript: " I checked the logs " } },
    ],
  });
  assert.deepEqual(cues, [{ seconds: 2.5, text: "I checked the logs" }]);

  recording = true;
  recognition.onend();
  assert.equal(recognition.startCount, 2);

  recognition.onerror({ error: "not-allowed" });
  assert.match(notes[0], /Microphone transcription was blocked/);

  recording = false;
  session.stop();
  assert.equal(recognition.stopCount, 1);
  assert.equal(recognition.startCount, 2);
});
