import { createPartFromUri } from "@google/genai";
import {
  CritiqueError,
  buildCritiquePrompt,
  critiqueResponseSchema,
  deliveryMode,
  mockChatReply,
  mockCritique,
  modelMessage,
  normalizeFileState,
  parseCritique,
  tooLargeMessage,
  toCritiqueError,
  uploadMessage,
} from "./critiqueFormat.js";
import { createGeminiClient } from "./geminiClient.js";
import { GEMINI_MODEL, isMockGemini } from "./geminiEnv.js";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120000;

const FOLLOW_UP_INSTRUCTION = [
  "You are Critiqify's interview coach in a follow-up conversation about one specific recording.",
  "The conversation history includes that video (with audio) and the structured critique you already gave.",
  "Answer questions about this recording and that critique.",
  "Refer to timestamps and the four categories (cadence, eye contact, filler words, intonation) when it helps.",
  "Reply in plain sentences, not JSON.",
  "Do not invent moments that were not in the recording.",
].join(" ");

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

function abortError() {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== "string") {
        reject(new CritiqueError("upload", uploadMessage()));
        return;
      }
      const marker = "base64,";
      const index = reader.result.indexOf(marker);
      resolve(index >= 0 ? reader.result.slice(index + marker.length) : reader.result);
    };
    reader.onerror = () => {
      reject(new CritiqueError("upload", uploadMessage()));
    };
    reader.readAsDataURL(blob);
  });
}

async function videoPartFor(ai, videoFile, signal, onProgress) {
  // Inline data for short clips. The Files API handles anything that would
  // push the base64 request over Gemini's 20MB limit, up to 2GB.
  const mode = deliveryMode(videoFile.size);
  if (mode === "too-large") {
    throw new CritiqueError("upload", tooLargeMessage());
  }

  const mimeType = videoFile.type || "video/webm";
  if (mode === "inline") {
    const data = await blobToBase64(videoFile);
    return {
      inlineData: {
        mimeType,
        data,
      },
    };
  }

  onProgress?.("upload");
  let uploaded;
  try {
    uploaded = await ai.files.upload({
      file: videoFile,
      config: {
        mimeType,
        displayName: videoFile.name || "interview-answer.webm",
        abortSignal: signal,
      },
    });
  } catch (error) {
    throw asUploadError(error, signal);
  }

  const ready = await waitUntilActive(ai, uploaded, signal);
  if (!ready?.uri) {
    throw new CritiqueError("upload", uploadMessage());
  }
  return createPartFromUri(ready.uri, ready.mimeType || mimeType);
}

async function waitUntilActive(ai, file, signal) {
  let current = file;
  const started = Date.now();
  for (;;) {
    if (signal?.aborted) throw abortError();
    const state = normalizeFileState(current?.state);
    if (state === "ACTIVE") return current;
    if (state === "FAILED") {
      throw new CritiqueError(
        "upload",
        "Gemini couldn't process this recording. Try a shorter clip.",
      );
    }
    if (Date.now() - started > POLL_TIMEOUT_MS) {
      throw new CritiqueError(
        "upload",
        "This recording is still processing. Try again in a moment or record a shorter clip.",
      );
    }
    await delay(POLL_INTERVAL_MS, signal);
    try {
      current = await ai.files.get({
        name: current.name,
        config: { abortSignal: signal },
      });
    } catch (error) {
      throw asUploadError(error, signal);
    }
  }
}

function asUploadError(error, signal) {
  if (signal?.aborted || error?.name === "AbortError") return abortError();
  const classified = toCritiqueError(error);
  if (classified.kind === "auth" || classified.kind === "missing_key") return classified;
  return new CritiqueError("upload", uploadMessage());
}

function responseText(response) {
  try {
    return typeof response?.text === "string" ? response.text : "";
  } catch (error) {
    throw toCritiqueError(error);
  }
}

async function mockSession({ videoFile, question, signal, onProgress }) {
  const mode = deliveryMode(videoFile?.size ?? 0);
  if (!videoFile || videoFile.size === 0) {
    throw new CritiqueError("upload", "Record a video before asking for a critique.");
  }
  if (mode === "too-large") {
    throw new CritiqueError("upload", tooLargeMessage());
  }
  if (mode === "files") onProgress?.("upload");
  onProgress?.("grade");
  await delay(900, signal);
  const critique = mockCritique(question);
  return {
    critique,
    ask: async (message) => {
      await delay(700, signal);
      const reply = mockChatReply(message, critique);
      if (!reply.trim()) throw new CritiqueError("model", modelMessage());
      return reply;
    },
  };
}

export async function startCritiqueSession({
  videoFile,
  question,
  signal,
  onProgress,
}) {
  if (isMockGemini()) {
    return mockSession({ videoFile, question, signal, onProgress });
  }
  if (!videoFile || videoFile.size === 0) {
    throw new CritiqueError("upload", "Record a video before asking for a critique.");
  }

  const ai = createGeminiClient("requesting a critique");
  const prompt = buildCritiquePrompt(question);
  const videoPart = await videoPartFor(ai, videoFile, signal, onProgress);
  onProgress?.("grade");

  let response;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [videoPart, { text: prompt }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: critiqueResponseSchema,
        temperature: 0.4,
        maxOutputTokens: 4096,
        abortSignal: signal,
      },
    });
  } catch (error) {
    if (signal?.aborted || error?.name === "AbortError") throw abortError();
    throw toCritiqueError(error);
  }

  const raw = responseText(response);
  if (!raw.trim()) throw new CritiqueError("model", modelMessage());
  const critique = parseCritique(raw);

  const chat = ai.chats.create({
    model: GEMINI_MODEL,
    history: [
      { role: "user", parts: [videoPart, { text: prompt }] },
      { role: "model", parts: [{ text: raw }] },
    ],
    config: {
      systemInstruction: FOLLOW_UP_INSTRUCTION,
      temperature: 0.4,
    },
  });

  return {
    critique,
    ask: async (message) => {
      let reply;
      try {
        reply = await chat.sendMessage({
          message,
          config: { abortSignal: signal },
        });
      } catch (error) {
        if (error?.name === "AbortError") throw abortError();
        throw toCritiqueError(error);
      }
      const text = responseText(reply).trim();
      if (!text) throw new CritiqueError("model", modelMessage());
      return text;
    },
  };
}
