import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_QUESTION } from "../demo/demoMode.js";
import {
  BEHAVIORAL_THEMES,
  MOCK_SAMPLE_QUESTIONS,
  initialSampleVariant,
  mockSampleQuestion,
  sampleQuestionPrompt,
} from "./sampleQuestions.js";

const FIELD_SPECIFIC =
  /\b(software|engineer|engineering|internship|bug|code|coding|algorithm|diagnos\w*|patient|clinical|classroom|curriculum|kubernetes|frontend|backend|database|api|leetcode)\b/i;

test("sample prompts ask for a field-agnostic behavioral question and rotate themes", () => {
  assert.ok(BEHAVIORAL_THEMES.length >= 5);
  assert.equal(BEHAVIORAL_THEMES.length, MOCK_SAMPLE_QUESTIONS.length);

  const prompts = BEHAVIORAL_THEMES.map((_, index) =>
    sampleQuestionPrompt(index),
  );
  assert.equal(new Set(prompts).size, prompts.length);

  for (const [index, prompt] of prompts.entries()) {
    assert.match(prompt, /behavioral interview question/i);
    assert.match(prompt, /any field/i);
    assert.match(prompt, /single sentence/i);
    assert.match(prompt, new RegExp(BEHAVIORAL_THEMES[index], "i"));
    assert.doesNotMatch(prompt, FIELD_SPECIFIC);
    assert.doesNotMatch(prompt, /software engineering internship/i);
  }

  assert.equal(sampleQuestionPrompt(prompts.length), prompts[0]);
  assert.equal(sampleQuestionPrompt(-1), prompts.at(-1));
  assert.equal(sampleQuestionPrompt(1.8), prompts[1]);
  assert.equal(sampleQuestionPrompt(Number.NaN), prompts[0]);
});

test("a prompt avoids repeating the question already on screen", () => {
  const shown = MOCK_SAMPLE_QUESTIONS[0];
  const prompt = sampleQuestionPrompt(1, `  ${shown}  `);
  assert.match(prompt, /Do not repeat this question/);
  assert.match(prompt, /handled a conflict/);
  assert.match(prompt, /failure you learned from/);

  const quoted = sampleQuestionPrompt(2, 'Say "hello"');
  assert.match(quoted, /Say 'hello'/);
  assert.doesNotMatch(quoted, /Say "hello"/);

  assert.doesNotMatch(sampleQuestionPrompt(0, "   "), /Do not repeat/);
  assert.doesNotMatch(sampleQuestionPrompt(0, null), /Do not repeat/);
});

test("mock and demo questions are varied behavioral prompts", () => {
  assert.equal(
    new Set(MOCK_SAMPLE_QUESTIONS).size,
    MOCK_SAMPLE_QUESTIONS.length,
  );

  const openings = new Set(
    MOCK_SAMPLE_QUESTIONS.map((question) =>
      question.split(" ").slice(0, 2).join(" "),
    ),
  );
  assert.ok(openings.size >= 4);

  for (const [index, question] of MOCK_SAMPLE_QUESTIONS.entries()) {
    assert.match(question, /[.?!]$/);
    const sentences = question.split(/[.?!]/).filter((part) => part.trim());
    assert.equal(sentences.length, 1);
    assert.doesNotMatch(question, FIELD_SPECIFIC);
    assert.doesNotMatch(question, /\btechnical\b/i);
    assert.match(
      question,
      new RegExp(BEHAVIORAL_THEMES[index].split(" ").at(-1), "i"),
    );
  }

  assert.match(MOCK_SAMPLE_QUESTIONS[0], /conflict/i);
  assert.match(MOCK_SAMPLE_QUESTIONS[1], /failure you learned from/i);
  assert.match(MOCK_SAMPLE_QUESTIONS[2], /formal authority/i);
  assert.match(MOCK_SAMPLE_QUESTIONS[3], /tight deadline/i);
  assert.match(MOCK_SAMPLE_QUESTIONS[4], /^Why do you want this role\?$/);

  assert.equal(mockSampleQuestion(0), MOCK_SAMPLE_QUESTIONS[0]);
  assert.notEqual(mockSampleQuestion(0), mockSampleQuestion(1));
  assert.equal(
    mockSampleQuestion(MOCK_SAMPLE_QUESTIONS.length),
    MOCK_SAMPLE_QUESTIONS[0],
  );
  assert.equal(mockSampleQuestion(-1), MOCK_SAMPLE_QUESTIONS.at(-1));
  assert.equal(DEMO_QUESTION, MOCK_SAMPLE_QUESTIONS[0]);
});

test("the next sample starts on a different theme when a question is already showing", () => {
  assert.equal(initialSampleVariant(""), 0);
  assert.equal(initialSampleVariant("   "), 0);
  assert.equal(initialSampleVariant(null), 0);
  assert.equal(initialSampleVariant(DEMO_QUESTION), 1);
  assert.equal(initialSampleVariant(`  ${MOCK_SAMPLE_QUESTIONS.at(-1)}  `), 0);
  assert.equal(initialSampleVariant("Why this design?"), 1);
  assert.equal(
    mockSampleQuestion(initialSampleVariant(DEMO_QUESTION)),
    MOCK_SAMPLE_QUESTIONS[1],
  );
});
