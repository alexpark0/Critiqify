import {
  cadenceEvidence,
  fillerHits,
  normalizeCues,
  renderTranscriptState,
} from "../speech/liveTranscript.js";

export const EYE_CONTACT_UNAVAILABLE =
  "Not graded. Jev only reads the transcript, so it cannot see where your eyes go. Grading eye contact would need a model that watches the video.";

export const INTONATION_UNAVAILABLE =
  "Not graded. Jev only reads the transcript, so it cannot hear pitch or emphasis. Grading intonation would need the audio, not just the words.";

const CADENCE_INSTRUCTIONS = [
  "How even is the speaking pace in this timestamped transcript?",
  "Use only the [m:ss] stamps and how much is said between them.",
  "A crowded run of words between close stamps is rushed.",
  "A long gap between stamps is a stall.",
  "Do not judge eye contact, pitch, or intonation.",
].join(" ");

const FILLER_INSTRUCTIONS = [
  "How free of filler words is this transcript?",
  "Fillers are um, uh, er, ah, hmm, like, you know, sort of, kind of, and I mean when they do not add meaning.",
  "Do not judge pace, eye contact, or pitch.",
].join(" ");

export const CADENCE_CRITERIA = [
  "The words are one unbroken run-on, or a long silence sits where an idea should be",
  "Several phrases run together without a break, or several long silences split the answer",
  "Some phrases are separated by a pause and others are delivered as one long run-on",
  "Phrases are separated, with a single crowded stretch or a single long silence",
  "Each idea is its own phrase, with a short pause between phrases and no crowded run-on",
];

export const FILLER_CRITERIA = [
  "Filler sounds or empty phrases such as um, uh, like, or you know appear in most phrases",
  "Fillers show up in several phrases and interrupt the point being made",
  "A handful of fillers appear inside otherwise clear phrases",
  "A single filler appears and the other phrases start on a real word",
  "Phrases start and end on real words, with no um, uh, like, you know, or similar fillers",
];

export class RubricError extends Error {
  constructor(detail) {
    super(detail);
    this.name = "RubricError";
    this.detail = detail;
  }
}

export function displayScore(jevScore, criteriaLength) {
  const top = criteriaLength - 1;
  const score = Number(jevScore);
  if (!Number.isFinite(score) || !Number.isFinite(top) || top <= 0) return null;
  const clamped = Math.min(top, Math.max(0, score));
  return Math.round(1 + (clamped / top) * 9);
}

export function letterGrade(score) {
  if (score >= 9) return "A";
  if (score >= 7) return "B";
  if (score >= 5) return "C";
  if (score >= 3) return "D";
  return "F";
}

export function buildQuestions(question) {
  const questions = {
    cadence: {
      type: "score",
      instructions: CADENCE_INSTRUCTIONS,
      criteria: CADENCE_CRITERIA,
    },
    fillerWords: {
      type: "score",
      instructions: FILLER_INSTRUCTIONS,
      criteria: FILLER_CRITERIA,
    },
  };
  const trimmed = typeof question === "string" ? question.trim() : "";
  if (trimmed) {
    questions.addressed = {
      type: "noul",
      instructions: `The transcript answers this practice question: ${trimmed}`,
    };
  }
  return questions;
}

export function unavailableCategory(name) {
  const explanation = name === "Eye contact" ? EYE_CONTACT_UNAVAILABLE : INTONATION_UNAVAILABLE;
  return {
    name,
    grade: "",
    score: null,
    unavailable: true,
    explanation,
    tips: [],
  };
}

function readScoreAnswer(answer, label) {
  if (!answer || answer.type !== "score") {
    throw new RubricError(`Jev did not return a score for ${label}.`);
  }
  const score = Number(answer.score);
  const confidence = Number(answer.confidence);
  if (!Number.isFinite(score) || !Number.isFinite(confidence)) {
    throw new RubricError(`Jev returned an unreadable ${label} score.`);
  }
  if (
    !answer.probabilities ||
    typeof answer.probabilities !== "object" ||
    Array.isArray(answer.probabilities)
  ) {
    throw new RubricError(`Jev returned no level probabilities for ${label}.`);
  }
  return {
    score,
    confidence,
    probabilities: answer.probabilities,
    legend: answer.legend && typeof answer.legend === "object" ? answer.legend : {},
  };
}

function nearestLevel(answer) {
  let bestKey = null;
  let best = -1;
  for (const [key, value] of Object.entries(answer.probabilities)) {
    const probability = Number(value);
    if (!Number.isFinite(probability) || probability < best) continue;
    best = probability;
    bestKey = key;
  }
  if (bestKey == null) return "";
  const label = answer.legend?.[bestKey];
  if (typeof label === "string") return label.trim();
  if (label && typeof label === "object" && typeof label.what === "string") return label.what.trim();
  return "";
}

function formatDistribution(answer, top) {
  const keys = Object.keys(answer.probabilities).sort((left, right) => Number(left) - Number(right));
  const parts = keys.map((key) => `${key} ${Number(answer.probabilities[key]).toFixed(2)}`);
  const confidence = Math.round(Math.min(1, Math.max(0, answer.confidence)) * 100);
  return `Raw Jev score ${answer.score.toFixed(2)} of ${top} (confidence ${confidence}%). Level probabilities: ${parts.join(", ")}.`;
}

function fillerClause(cues) {
  const hits = fillerHits(cues).slice(0, 4);
  if (hits.length === 0) return "The transcript has no obvious filler tokens to point at.";
  const list = hits.map((hit) => `${hit.word} at ${hit.timestamp}`).join(", ");
  return `Possible fillers in the transcript: ${list}.`;
}

function cadenceClause(cues) {
  const { pauses, rushes } = cadenceEvidence(cues);
  const parts = [];
  for (const pause of pauses.slice(0, 2)) {
    parts.push(`a pause of about ${pause.gap.toFixed(1)}s before ${pause.timestamp}`);
  }
  for (const rush of rushes.slice(0, 2)) {
    parts.push(`a crowded phrase at ${rush.timestamp}`);
  }
  if (parts.length === 0) {
    return "The transcript timing has no long pause or crowded phrase to point at.";
  }
  return `Transcript timing shows ${parts.join(" and ")}.`;
}

function cadenceTips(score) {
  if (score >= 8) {
    return [
      "Keep a short pause between ideas.",
      "Land the last sentence at the same pace as the rest.",
    ];
  }
  if (score >= 5) {
    return [
      "Pause after you name the problem, then give the one-sentence answer.",
      "If a phrase runs long, stop at the next period and breathe.",
    ];
  }
  return [
    "Say one idea, then stop. Start the next idea after a breath.",
    "Mark the ending out loud and slow down for that sentence.",
  ];
}

function fillerTips(score) {
  if (score >= 8) {
    return [
      "Keep starting on the first real word.",
      "A silent pause still counts as a clean start.",
    ];
  }
  if (score >= 5) {
    return [
      "Replace the opening filler with a silent breath.",
      "If you need a moment, say nothing instead of uh or like.",
    ];
  }
  return [
    "Start the take on the first real word.",
    "When a filler shows up, pause and restate that sentence.",
    "Jot three beats before you record so the middle has a path.",
  ];
}

function scoredCategory({ name, answer, criteria, evidence }) {
  const shown = displayScore(answer.score, criteria.length);
  if (shown == null) throw new RubricError(`Jev returned an unreadable ${name} score.`);
  const level = nearestLevel(answer);
  const levelSentence = level ? `Nearest rubric level: “${level}”. ` : "";
  const tips = name === "Filler words" ? fillerTips(shown) : cadenceTips(shown);
  return {
    name,
    grade: letterGrade(shown),
    score: shown,
    unavailable: false,
    explanation: `Jev scored this ${shown}/10. ${levelSentence}${formatDistribution(answer, criteria.length - 1)} ${evidence} Jev does not write an explanation; any timestamps come from the transcript.`,
    tips,
  };
}

function addressedText(question, answer) {
  const trimmed = typeof question === "string" ? question.trim() : "";
  if (!trimmed) return "";
  const probability = Number(answer?.noul);
  if (!answer || answer.type !== "noul" || !Number.isFinite(probability)) {
    throw new RubricError(
      "Jev did not return a probability for whether the answer addressed the question.",
    );
  }
  const percent = Math.round(Math.min(1, Math.max(0, probability)) * 100);
  const lean = percent >= 50 ? "This leans toward yes." : "This leans toward no.";
  return `Jev's probability that the transcript addresses “${trimmed}” is ${percent} percent. ${lean} Jev does not describe what was covered or left out.`;
}

export function critiqueFromJev({ response, cues, question = "" }) {
  const answers = response?.answers;
  if (!answers || typeof answers !== "object") {
    throw new RubricError("Jev returned no answers.");
  }
  const list = normalizeCues(cues);
  if (list.length === 0) throw new RubricError("There is no transcript to attach to this grade.");
  const cadenceAnswer = readScoreAnswer(answers.cadence, "cadence");
  const fillerAnswer = readScoreAnswer(answers.fillerWords, "filler words");
  const cadence = scoredCategory({
    name: "Cadence (pacing)",
    answer: cadenceAnswer,
    criteria: CADENCE_CRITERIA,
    evidence: cadenceClause(list),
  });
  const fillers = scoredCategory({
    name: "Filler words",
    answer: fillerAnswer,
    criteria: FILLER_CRITERIA,
    evidence: fillerClause(list),
  });
  return {
    summary: `Jev scored cadence ${cadence.score}/10 and filler words ${fillers.score}/10 from the transcript. Eye contact and intonation are not graded, because a transcript has no picture and no pitch.`,
    addressedQuestion: addressedText(question, answers.addressed),
    transcriptText: renderTranscriptState(list, question),
    model: typeof response.model === "string" ? response.model : "",
    categories: [
      cadence,
      unavailableCategory("Eye contact"),
      fillers,
      unavailableCategory("Intonation"),
    ],
  };
}
