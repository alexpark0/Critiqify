import assert from "node:assert/strict";
import test from "node:test";
import { mockCritique } from "../gemini/critiqueFormat.js";
import { buildCoachPrompt, localCoachReply } from "./coachReply.js";

test("the local coach refuses to invent eye contact or intonation", () => {
  const critique = mockCritique("Tell me about a bug.");
  const eyes = localCoachReply("Did I hold eye contact?", critique);
  assert.match(eyes, /Not graded/);
  assert.match(eyes, /cannot see/);
  assert.match(eyes, /Cadence is 7\/10/);
  assert.doesNotMatch(eyes, /0:22/);

  const voice = localCoachReply("How was my intonation?", critique);
  assert.match(voice, /cannot hear/);
  assert.match(voice, /filler words are 5\/10/);
});

test("the local coach quotes the Jev note for a filler question", () => {
  const critique = mockCritique("");
  const reply = localCoachReply("How do I cut the fillers?", critique);
  assert.match(reply, /0:08/);
  assert.match(reply, /Cadence is 7\/10/);
  assert.match(reply, /not graded/i);
});

test("the Gemini coach prompt is grounded in the transcript and the grades", () => {
  const critique = mockCritique("Tell me about a bug.");
  const prompt = buildCoachPrompt({
    message: "What should I redo?",
    critique,
    transcriptText: "[0:11] then I rushed the fix",
  });
  assert.match(prompt, /cannot see the video/);
  assert.match(prompt, /Eye contact and intonation were not graded/);
  assert.match(prompt, /\[0:11\] then I rushed the fix/);
  assert.match(prompt, /What should I redo\?/);
  assert.match(prompt, /Cadence \(pacing\)/);
});
