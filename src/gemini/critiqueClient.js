import { COACH_SYSTEM, buildCoachPrompt, localCoachReply } from "../coach/coachReply.js";
import { gradeTranscript } from "../jev/jevClient.js";
import { missingTranscriptMessage } from "../jev/messages.js";
import { normalizeCues, renderTranscriptState } from "../speech/liveTranscript.js";
import {
  CritiqueError,
  mockChatReply,
  mockCritique,
  toCritiqueError,
} from "./critiqueFormat.js";
import { createGeminiClient } from "./geminiClient.js";
import { GEMINI_MODEL, geminiApiKey, isMockGemini } from "./geminiEnv.js";

function abortError() {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function mockSession({ videoFile, question, signal, onProgress, sleep }) {
  if (!videoFile || videoFile.size === 0) {
    throw new CritiqueError("upload", "Record a video before asking for a critique.");
  }
  onProgress?.("grade");
  await sleep(900, signal);
  const critique = mockCritique(question);
  return {
    critique,
    ask: async (message) => {
      await sleep(700, signal);
      const reply = mockChatReply(message, critique);
      if (!reply.trim()) throw new CritiqueError("model", "The coach reply was empty.");
      return reply;
    },
  };
}

export async function geminiCoachReply({ message, critique, transcriptText, signal }) {
  const ai = createGeminiClient("asking a follow-up");
  let response;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildCoachPrompt({ message, critique, transcriptText }),
      config: {
        systemInstruction: COACH_SYSTEM,
        temperature: 0.4,
        abortSignal: signal,
      },
    });
  } catch (error) {
    if (signal?.aborted || error?.name === "AbortError") throw abortError();
    throw toCritiqueError(error);
  }
  try {
    return typeof response?.text === "string" ? response.text.trim() : "";
  } catch (error) {
    throw toCritiqueError(error);
  }
}

async function answerFollowUp({
  message,
  critique,
  cues,
  question,
  signal,
  completeCoach,
}) {
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) throw new CritiqueError("model", "Enter a follow-up question.");
  if (!geminiApiKey()) return localCoachReply(text, critique);
  const reply = await (completeCoach || geminiCoachReply)({
    message: text,
    critique,
    transcriptText: renderTranscriptState(cues, question),
    signal,
  });
  if (!reply || !String(reply).trim()) {
    throw new CritiqueError("model", "The coach reply was empty.", { retryable: true });
  }
  return String(reply).trim();
}

export async function startCritiqueSession({
  videoFile,
  question = "",
  transcript = [],
  transcriptNote = "",
  demo = false,
  signal,
  onProgress,
  fetchImpl,
  sleep = delay,
  completeCoach,
}) {
  if (demo || isMockGemini()) {
    return mockSession({ videoFile, question, signal, onProgress, sleep });
  }
  if (!videoFile || videoFile.size === 0) {
    throw new CritiqueError("upload", "Record a video before asking for a critique.");
  }

  const cues = normalizeCues(transcript);
  if (cues.length === 0) {
    throw new CritiqueError("transcript", transcriptNote || missingTranscriptMessage());
  }

  onProgress?.("grade");
  const critique = await gradeTranscript({
    cues,
    question,
    signal,
    onProgress,
    fetchImpl,
    sleep,
  });

  return {
    critique,
    ask: (message) =>
      answerFollowUp({
        message,
        critique,
        cues,
        question,
        signal,
        completeCoach,
      }),
  };
}
