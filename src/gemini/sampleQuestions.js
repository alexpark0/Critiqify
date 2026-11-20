const SAMPLE_PROMPTS = [
  {
    theme: "a time you handled a conflict",
    question:
      "Tell me about a time you handled a conflict with someone you worked with, and how you resolved it.",
  },
  {
    theme: "a failure you learned from",
    question:
      "Describe a failure you learned from and what you changed afterward.",
  },
  {
    theme: "leading without formal authority",
    question: "How have you led an effort when you had no formal authority?",
  },
  {
    theme: "meeting a tight deadline",
    question:
      "Tell me about meeting a tight deadline and how you chose what to do first.",
  },
  {
    theme: "why you want this role",
    question: "Why do you want this role?",
  },
  {
    theme: "acting on difficult feedback",
    question:
      "What did you do with the last piece of difficult feedback you received?",
  },
  {
    theme: "adapting when priorities changed",
    question:
      "Describe a time priorities changed suddenly and how you adapted.",
  },
  {
    theme: "working with someone whose style differed from yours",
    question:
      "Tell me about working with someone whose style was very different from yours.",
  },
  {
    theme: "a goal you set and how you measured progress",
    question:
      "Give an example of a goal you set and how you measured progress toward it.",
  },
  {
    theme: "making a decision with incomplete information",
    question:
      "Walk me through a decision you made before you had all the information you wanted.",
  },
];

export const BEHAVIORAL_THEMES = SAMPLE_PROMPTS.map((item) => item.theme);

export const MOCK_SAMPLE_QUESTIONS = SAMPLE_PROMPTS.map(
  (item) => item.question,
);

function sampleVariant(index) {
  const count = SAMPLE_PROMPTS.length;
  const n = Number.isFinite(index) ? Math.trunc(index) : 0;
  return ((n % count) + count) % count;
}

export function mockSampleQuestion(index) {
  return MOCK_SAMPLE_QUESTIONS[sampleVariant(index)];
}

export function initialSampleVariant(question = "") {
  const trimmed = typeof question === "string" ? question.trim() : "";
  if (!trimmed) return 0;
  const match = MOCK_SAMPLE_QUESTIONS.findIndex((item) => item === trimmed);
  return sampleVariant((match >= 0 ? match : 0) + 1);
}

export function sampleQuestionPrompt(index, previous = "") {
  const theme = BEHAVIORAL_THEMES[sampleVariant(index)];
  const prior =
    typeof previous === "string" ? previous.trim().replaceAll('"', "'") : "";
  const avoid = prior ? ` Do not repeat this question: "${prior}".` : "";
  return `Write one typical behavioral interview question that an interviewer could ask a candidate in any field. Do not mention a profession, industry, technology, tool, or employer. Focus on ${theme}. Respond with only the question, in a single sentence.${avoid}`;
}
