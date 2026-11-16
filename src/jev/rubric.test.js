import assert from "node:assert/strict";
import test from "node:test";
import {
  CADENCE_CRITERIA,
  FILLER_CRITERIA,
  RubricError,
  buildQuestions,
  critiqueFromJev,
  displayScore,
  letterGrade,
} from "./rubric.js";

const CUES = [
  { seconds: 2, text: "um I checked the logs first" },
  { seconds: 8, text: "and then I looked at the dashboard" },
  { seconds: 9, text: "I restarted the service and added a guard and shipped the fix and told the team" },
  { seconds: 10, text: "that was the close" },
];

function scoreAnswer(score, confidence, peak) {
  const probabilities = { 0: 0.05, 1: 0.05, 2: 0.1, 3: 0.1, 4: 0.7 };
  probabilities[peak] = 0.7;
  return {
    type: "score",
    score,
    confidence,
    legend: {
      0: "low",
      1: "several",
      2: "mixed",
      3: "mostly",
      4: "even",
    },
    probabilities,
  };
}

function response() {
  return {
    model: "jev-1.13.0",
    answers: {
      cadence: scoreAnswer(3.2, 0.72, 3),
      fillerWords: scoreAnswer(1.1, 0.64, 1),
      addressed: { type: "noul", noul: 0.82 },
    },
    usage: { input_tokens: 120, output_tokens: 18 },
  };
}

test("questions are score rubrics, and the practice question is a noul", () => {
  const bare = buildQuestions("  ");
  assert.equal(bare.cadence.type, "score");
  assert.equal(bare.fillerWords.type, "score");
  assert.equal(bare.addressed, undefined);
  assert.equal(bare.eyeContact, undefined);
  assert.equal(bare.intonation, undefined);
  assert.ok(CADENCE_CRITERIA.length >= 2 && CADENCE_CRITERIA.length <= 10);
  assert.ok(FILLER_CRITERIA.length >= 2 && FILLER_CRITERIA.length <= 10);
  assert.match(bare.cadence.instructions, /timestamped transcript/);
  assert.match(bare.fillerWords.instructions, /filler words/);

  const asked = buildQuestions("Tell me about a bug.");
  assert.equal(asked.addressed.type, "noul");
  assert.match(asked.addressed.instructions, /Tell me about a bug\./);
});

test("a Jev score on a five-level rubric maps onto the 1 to 10 display", () => {
  assert.equal(displayScore(0, 5), 1);
  assert.equal(letterGrade(1), "F");
  assert.equal(displayScore(2, 5), 6);
  assert.equal(letterGrade(6), "C");
  assert.equal(displayScore(3.2, 5), 8);
  assert.equal(letterGrade(8), "B");
  assert.equal(displayScore(4, 5), 10);
  assert.equal(letterGrade(10), "A");
  assert.equal(displayScore(Number.NaN, 5), null);
});

test("critiqueFromJev keeps Jev scores and leaves eye contact and intonation blank", () => {
  const critique = critiqueFromJev({
    response: response(),
    cues: CUES,
    question: "Tell me about a bug.",
  });
  assert.equal(critique.model, "jev-1.13.0");
  assert.equal(critique.categories[0].name, "Cadence (pacing)");
  assert.equal(critique.categories[0].score, 8);
  assert.equal(critique.categories[0].grade, "B");
  assert.match(critique.categories[0].explanation, /Raw Jev score 3\.20 of 4/);
  assert.match(critique.categories[0].explanation, /0:08/);
  assert.match(critique.categories[0].explanation, /does not write an explanation/);
  assert.equal(critique.categories[1].unavailable, true);
  assert.equal(critique.categories[1].score, null);
  assert.equal(critique.categories[1].tips.length, 0);
  assert.match(critique.categories[1].explanation, /cannot see/);
  assert.equal(critique.categories[2].name, "Filler words");
  assert.equal(critique.categories[2].score, 3);
  assert.match(critique.categories[2].explanation, /um at 0:02/);
  assert.equal(critique.categories[3].unavailable, true);
  assert.match(critique.categories[3].explanation, /cannot hear/);
  assert.match(critique.summary, /cadence 8\/10/);
  assert.match(critique.summary, /not graded/);
  assert.match(critique.addressedQuestion, /82 percent/);
  assert.match(critique.addressedQuestion, /leans toward yes/);
  assert.match(critique.transcriptText, /\[0:02\] um I checked the logs first/);
});

test("a low noul leans no, and a missing answer is rejected", () => {
  const payload = response();
  payload.answers.addressed = { type: "noul", noul: 0.2 };
  const critique = critiqueFromJev({
    response: payload,
    cues: CUES,
    question: "Tell me about a bug.",
  });
  assert.match(critique.addressedQuestion, /20 percent/);
  assert.match(critique.addressedQuestion, /leans toward no/);

  const unasked = critiqueFromJev({ response: response(), cues: CUES, question: " " });
  assert.equal(unasked.addressedQuestion, "");

  assert.throws(
    () => critiqueFromJev({ response: { answers: {} }, cues: CUES, question: "" }),
    (error) => error instanceof RubricError,
  );
});
