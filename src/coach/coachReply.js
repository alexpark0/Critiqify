const COACH_RULES = [
  "You are Critiqify's interview coach for one recorded answer.",
  "You can read the transcript and the grades. You cannot see the video or hear the voice.",
  "Eye contact and intonation were not graded. Say that they are unavailable instead of inventing a score or a moment.",
  "Timestamps in the notes come from the transcript. Do not invent timestamps that are not in the transcript or the notes.",
  "Reply in plain sentences, not JSON.",
].join(" ");

export function buildCoachPrompt({ message, critique, transcriptText }) {
  return [
    COACH_RULES,
    "",
    transcriptText || "",
    "",
    "Grades:",
    JSON.stringify(
      {
        summary: critique?.summary || "",
        addressedQuestion: critique?.addressedQuestion || "",
        categories: critique?.categories || [],
      },
      null,
      2,
    ),
    "",
    `Follow-up question: ${message}`,
  ].join("\n");
}

export const COACH_SYSTEM = COACH_RULES;

function findCategory(critique, name) {
  const categories = Array.isArray(critique?.categories) ? critique.categories : [];
  return categories.find((item) => item?.name === name);
}

export function localCoachReply(message, critique) {
  const asked = typeof message === "string" ? message.trim() : "";
  const cadence = findCategory(critique, "Cadence (pacing)");
  const fillers = findCategory(critique, "Filler words");
  const eyes = findCategory(critique, "Eye contact");
  const tone = findCategory(critique, "Intonation");
  const lower = asked.toLowerCase();
  const focus = /eye|gaze|camera|look/.test(lower)
    ? eyes
    : /intonation|pitch|emphasis|vocal|tone of voice|\bvoice\b/.test(lower)
      ? tone
      : /\bfiller|\bum\b|\buh\b|\blike\b/.test(lower)
        ? fillers
        : cadence;
  const cadenceScore = cadence?.score ?? "—";
  const fillerScore = fillers?.score ?? "—";
  if (focus?.unavailable) {
    return `${focus.explanation} Cadence is ${cadenceScore}/10 and filler words are ${fillerScore}/10, which is what Jev can grade from the transcript.`;
  }
  const note = focus?.explanation || critique?.summary || "Use the grades on this take.";
  return `About “${asked}”: ${note} Cadence is ${cadenceScore}/10 and filler words are ${fillerScore}/10. Eye contact and intonation were not graded.`;
}
