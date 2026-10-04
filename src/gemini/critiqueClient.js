import { createPartFromUri } from "@google/genai";
import {
  CritiqueError,
  FILE_PROCESS_TIMEOUT_MS,
  buildCritiquePrompt,
  critiqueResponseSchema,
  deliveryMode,
  describeGenerateResult,
  fileFailedMessage,
  isFileNotReadyError,
  isRetryableGeminiError,
  mockChatReply,
  mockCritique,
  modelMessage,
  nextPollDelayMs,
  normalizeFileState,
  normalizeVideoMimeType,
  parseCritique,
  readGenerateResult,
  stillProcessingMessage,
  tooLargeMessage,
  toCritiqueError,
  unwrapGeminiFile,
  uploadMessage,
} from "./critiqueFormat.js";
import { createGeminiClient } from "./geminiClient.js";
import { GEMINI_MODEL, isMockGemini } from "./geminiEnv.js";

const FILE_READY_ATTEMPTS = 3;
const GRADE_ATTEMPTS = 3;
const OUTPUT_TOKEN_LIMIT = 16384;

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

async function blobToBase64(blob) {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  } catch {
    throw new CritiqueError("upload", uploadMessage());
  }
}

async function videoPartFor(ai, videoFile, signal, onProgress) {
  // Inline data for short clips. The Files API handles anything that would
  // push the base64 request over Gemini's 20MB limit, up to 2GB.
  const mode = deliveryMode(videoFile.size);
  if (mode === "too-large") {
    throw new CritiqueError("upload", tooLargeMessage());
  }

  const mimeType = normalizeVideoMimeType(videoFile.type);
  if (mode === "inline") {
    const data = await blobToBase64(videoFile);
    return {
      part: {
        inlineData: {
          mimeType,
          data,
        },
      },
      file: null,
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

  const ready = await pollFileUntilActive({
    file: uploaded,
    signal,
    onProgress,
    getFile: fileGetter(ai, signal),
  });
  return { part: partFromFile(ready, mimeType), file: ready };
}

function fileGetter(ai, signal) {
  return (name) =>
    ai.files.get({
      name,
      config: { abortSignal: signal },
    });
}

function partFromFile(file, mimeType) {
  return createPartFromUri(file.uri, file.mimeType || mimeType);
}

export async function pollFileUntilActive({
  file,
  signal,
  onProgress,
  getFile,
  sleep = delay,
  now = () => Date.now(),
  timeoutMs = FILE_PROCESS_TIMEOUT_MS,
}) {
  let current = unwrapGeminiFile(file);
  if (!current?.name) {
    throw new CritiqueError("upload", uploadMessage());
  }

  const started = now();
  let delayMs = 0;
  for (;;) {
    if (signal?.aborted) throw abortError();
    if (now() - started > timeoutMs) {
      throw new CritiqueError("processing", stillProcessingMessage());
    }
    if (delayMs > 0) await sleep(delayMs, signal);
    if (signal?.aborted) throw abortError();
    if (now() - started > timeoutMs) {
      throw new CritiqueError("processing", stillProcessingMessage());
    }

    try {
      current = unwrapGeminiFile(await getFile(current.name));
    } catch (error) {
      if (signal?.aborted || error?.name === "AbortError") throw abortError();
      const classified = toCritiqueError(error);
      if (classified.kind === "auth" || classified.kind === "missing_key") throw classified;
      if (!isRetryableGeminiError(error)) throw new CritiqueError("upload", uploadMessage());
      delayMs = nextPollDelayMs(delayMs);
      continue;
    }

    const state = normalizeFileState(current?.state);
    if (state === "FAILED" || (state !== "ACTIVE" && current?.error?.message)) {
      throw new CritiqueError("upload", fileFailedMessage());
    }
    if (state === "ACTIVE" && current?.uri) return current;
    onProgress?.("process");
    delayMs = nextPollDelayMs(delayMs);
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
  if (mode === "files") {
    onProgress?.("upload");
    onProgress?.("process");
  }
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
  const mimeType = normalizeVideoMimeType(videoFile.type);
  logCritique("info", "starting critique", {
    model: GEMINI_MODEL,
    bytes: videoFile.size,
    mime: mimeType,
    mode: deliveryMode(videoFile.size),
  });
  const media = await videoPartFor(ai, videoFile, signal, onProgress);
  onProgress?.("grade");

  const graded = await generateCritique(ai, media, prompt, signal, onProgress);
  const raw = graded.raw;
  const critique = graded.critique;

  if (media.file) {
    media.file = await pollFileUntilActive({
      file: media.file,
      signal,
      onProgress,
      getFile: fileGetter(ai, signal),
    });
    media.part = partFromFile(media.file, mimeType);
  }

  const chat = ai.chats.create({
    model: GEMINI_MODEL,
    history: [
      { role: "user", parts: [media.part, { text: prompt }] },
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
      let lastError = null;
      for (let attempt = 1; attempt <= FILE_READY_ATTEMPTS; attempt += 1) {
        try {
          const reply = await chat.sendMessage({
            message,
            config: { abortSignal: signal },
          });
          const text = responseText(reply).trim();
          if (!text) {
            throw new CritiqueError("model", modelMessage(), {
              detail: "The follow-up response had no text.",
              retryable: true,
            });
          }
          return text;
        } catch (error) {
          if (signal?.aborted || error?.name === "AbortError") throw abortError();
          const parsed = toCritiqueError(error);
          lastError = parsed;
          logCritique("error", "follow-up failed", {
            attempt,
            kind: parsed.kind,
            retryable: parsed.retryable,
            detail: parsed.detail || error?.message,
          });
          const again =
            attempt < FILE_READY_ATTEMPTS &&
            (isFileNotReadyError(error) || parsed.retryable);
          if (!again) break;
          if (media.file && isFileNotReadyError(error)) {
            media.file = await pollFileUntilActive({
              file: media.file,
              signal,
              getFile: fileGetter(ai, signal),
            });
          } else {
            await delay(1000 * attempt, signal);
          }
        }
      }
      throw lastError || new CritiqueError("model", modelMessage());
    },
  };
}

function logCritique(level, message, details) {
  const write = level === "error" ? console.error : console.log;
  write(`[critiqify] ${message}`, details);
}

function gradeConfig(signal) {
  return {
    responseMimeType: "application/json",
    responseSchema: critiqueResponseSchema,
    temperature: 0.4,
    maxOutputTokens: OUTPUT_TOKEN_LIMIT,
    // gemini-3.8-flash thinks at medium by default, and those tokens count
    // against maxOutputTokens. Low keeps the JSON from being cut off.
    thinkingConfig: { thinkingLevel: "LOW" },
    abortSignal: signal,
  };
}

async function generateCritique(ai, media, prompt, signal, onProgress) {
  let lastError = null;
  for (let attempt = 1; attempt <= GRADE_ATTEMPTS; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [media.part, { text: prompt }],
          },
        ],
        config: gradeConfig(signal),
      });
      const result = readGenerateResult(response);
      logCritique("info", "generateContent finished", {
        attempt,
        finishReason: result.finishReason,
        blockReason: result.blockReason,
        thoughtsTokenCount: result.thoughtsTokenCount,
        candidatesTokenCount: result.candidatesTokenCount,
        textPreview: result.text.slice(0, 180),
      });
      if (result.blocked) {
        throw new CritiqueError("model", "Gemini blocked this critique.", {
          detail: describeGenerateResult(result, "The response was blocked."),
          retryable: false,
        });
      }
      if (!result.text.trim()) {
        throw new CritiqueError("model", modelMessage(), {
          detail: describeGenerateResult(result, "The model did not return a complete critique."),
          retryable: true,
        });
      }
      try {
        const critique = parseCritique(result.text);
        return { raw: result.text, critique };
      } catch (error) {
        const parsed = toCritiqueError(error);
        throw new CritiqueError(parsed.kind, parsed.message, {
          detail: [parsed.detail, describeGenerateResult(result)].filter(Boolean).join("\n"),
          retryable: true,
        });
      }
    } catch (error) {
      if (signal?.aborted || error?.name === "AbortError") throw abortError();
      const parsed = toCritiqueError(error);
      lastError = parsed;
      logCritique("error", "critique attempt failed", {
        attempt,
        kind: parsed.kind,
        retryable: parsed.retryable,
        message: parsed.message,
        detail: parsed.detail,
        status: error?.status,
        finishReason: error?.finishReason,
      });
      const again =
        attempt < GRADE_ATTEMPTS &&
        (parsed.retryable || isFileNotReadyError(error) || isRetryableGeminiError(error));
      if (!again) break;
      if (isFileNotReadyError(error) && media.file) {
        onProgress?.("process");
        media.file = await pollFileUntilActive({
          file: media.file,
          signal,
          onProgress,
          getFile: fileGetter(ai, signal),
        });
        media.part = partFromFile(media.file, normalizeVideoMimeType(media.file.mimeType));
      } else {
        onProgress?.("retry");
        await delay(1000 * attempt, signal);
      }
      onProgress?.("grade");
    }
  }
  logCritique("error", "critique failed", {
    kind: lastError?.kind,
    message: lastError?.message,
    detail: lastError?.detail,
  });
  throw lastError || new CritiqueError("model", modelMessage());
}
