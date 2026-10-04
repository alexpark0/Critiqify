/**
 * Raw bytes that still fit inline after base64 expands them under Gemini's
 * 20MB request limit. 10 MiB becomes about 14MB of base64, leaving room for
 * the prompt and the JSON schema. Larger clips use the Files API.
 */
export const INLINE_VIDEO_MAX_BYTES = 10 * 1024 * 1024;

/** How long to wait for a Files API upload to leave PROCESSING. */
export const FILE_PROCESS_TIMEOUT_MS = 5 * 60 * 1000;

/** Free-tier Gemini Files API limit per video. */
export const FILE_API_MAX_BYTES = 2 * 1024 * 1024 * 1024;

export const CATEGORY_ORDER = [
  "Cadence (pacing)",
  "Eye contact",
  "Filler words",
  "Intonation",
];

const GRADES = ["A", "B", "C", "D", "F"];

const CATEGORY_ALIASES = {
  "cadence (pacing)": "Cadence (pacing)",
  cadence: "Cadence (pacing)",
  pacing: "Cadence (pacing)",
  "eye contact": "Eye contact",
  "filler words": "Filler words",
  fillers: "Filler words",
  intonation: "Intonation",
};

const KEY_URL = "https://aistudio.google.com/apikey";

export class CritiqueError extends Error {
  constructor(kind, message, extra) {
    super(message);
    this.name = "CritiqueError";
    this.kind = kind;
    const options = typeof extra === "string" ? { detail: extra } : extra || {};
    this.detail = typeof options.detail === "string" ? options.detail : "";
    this.retryable = Boolean(options.retryable);
  }
}

/** Gemini lists video/webm, not the codec suffix MediaRecorder often appends. */
export function normalizeVideoMimeType(type) {
  const raw = typeof type === "string" ? type.trim().toLowerCase() : "";
  const base = raw.split(";")[0].trim();
  if (base === "video/webm" || base === "video/mp4" || base === "video/quicktime" || base === "video/mpeg") {
    return base;
  }
  return "video/webm";
}

export function missingKeyMessage(action) {
  return `Add a Gemini API key before ${action}. Create one at ${KEY_URL}, set VITE_API_KEY in .env, and restart the dev server.`;
}

export function rejectedKeyMessage() {
  return `The Gemini API key was rejected. It may be invalid or expired. Create a new key at ${KEY_URL}, update VITE_API_KEY in .env, and restart the dev server.`;
}

export function uploadMessage() {
  return "The recording couldn't be uploaded to Gemini. Try a shorter clip, or check your connection and try again.";
}

export function tooLargeMessage() {
  return "This recording is larger than Gemini's 2 GB upload limit. Record a shorter answer and try again.";
}

export function modelMessage() {
  return "Gemini couldn't finish this critique. The model may be busy, or the response couldn't be read. Try again.";
}

export function stillProcessingMessage() {
  return "This recording is still processing. It can take a few minutes. Try again, or record a shorter clip.";
}

export function fileFailedMessage() {
  return "Gemini couldn't process this recording. Try a shorter clip.";
}

export function titleForKind(kind) {
  switch (kind) {
    case "missing_key":
      return "Gemini API key needed";
    case "auth":
      return "Gemini rejected the API key";
    case "upload":
      return "Upload failed";
    case "processing":
      return "Video still processing";
    case "model":
      return "Gemini couldn't respond";
    default:
      return "Something went wrong";
  }
}

export function deliveryMode(byteLength) {
  if (!Number.isFinite(byteLength) || byteLength < 0) return "too-large";
  if (byteLength > FILE_API_MAX_BYTES) return "too-large";
  if (byteLength > INLINE_VIDEO_MAX_BYTES) return "files";
  return "inline";
}

export function normalizeFileState(state) {
  let normalized = "";
  if (typeof state === "string") normalized = state.toUpperCase();
  else if (state && typeof state === "object" && typeof state.name === "string") {
    normalized = state.name.toUpperCase();
  } else if (state != null && state !== "") {
    normalized = String(state).toUpperCase();
  }
  if (!normalized || normalized === "STATE_UNSPECIFIED") return "PENDING";
  return normalized;
}

export function unwrapGeminiFile(value) {
  if (
    value &&
    typeof value === "object" &&
    value.file &&
    typeof value.file === "object" &&
    (value.file.name || value.file.uri || value.file.state)
  ) {
    return value.file;
  }
  return value;
}

export function nextPollDelayMs(previous) {
  if (!previous || previous < 1000) return 1000;
  return Math.min(previous * 2, 8000);
}

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export function geminiHttpStatus(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  return Number.isFinite(status) ? status : 0;
}

export function isRetryableGeminiError(error) {
  if (!error || error?.name === "AbortError" || error instanceof CritiqueError) return false;
  if (RETRYABLE_STATUSES.has(geminiHttpStatus(error))) return true;
  const message = extractMessage(error).toLowerCase();
  return /resource_exhausted|unavailable|overloaded|rate limit|too many requests|internal error/.test(
    message,
  );
}

export function isFileNotReadyError(error) {
  const message = extractMessage(error).toLowerCase();
  return /not in an active state|still processing|file .{0,80}processing|not ready|failed_precondition/.test(
    message,
  );
}

export function buildCritiquePrompt(question) {
  const trimmed = typeof question === "string" ? question.trim() : "";
  const questionBlock = trimmed
    ? `The candidate was answering this practice question: "${trimmed}". In addressedQuestion, say whether the answer addressed it, citing what they said or left out.`
    : "No practice question was provided. Set addressedQuestion to an empty string.";

  return [
    "You are an interview coach reviewing one recorded answer. Watch the video and listen to the audio.",
    "Grade exactly these four categories: Cadence (pacing), Eye contact, Filler words, and Intonation.",
    "For each category include a letter grade (A, B, C, D, or F), an integer score from 1 to 10, a short explanation tied to specific moments with timestamps in m:ss when you can point to them, and two or three concrete tips.",
    "Write a brief overall summary of two to four sentences.",
    questionBlock,
    "Base every comment on this recording only. Do not invent moments you cannot see or hear.",
  ].join("\n\n");
}

export const critiqueResponseSchema = {
  type: "OBJECT",
  propertyOrdering: ["summary", "addressedQuestion", "categories"],
  required: ["summary", "addressedQuestion", "categories"],
  properties: {
    summary: {
      type: "STRING",
      description: "Brief overall summary, two to four sentences.",
    },
    addressedQuestion: {
      type: "STRING",
      description:
        "Whether the answer addressed the practice question. Empty string if no question was provided.",
    },
    categories: {
      type: "ARRAY",
      minItems: "4",
      maxItems: "4",
      description: "Exactly one entry for each required category.",
      items: {
        type: "OBJECT",
        propertyOrdering: ["name", "grade", "score", "explanation", "tips"],
        required: ["name", "grade", "score", "explanation", "tips"],
        properties: {
          name: {
            type: "STRING",
            format: "enum",
            enum: CATEGORY_ORDER,
          },
          grade: {
            type: "STRING",
            format: "enum",
            enum: GRADES,
          },
          score: {
            type: "INTEGER",
            minimum: 1,
            maximum: 10,
            description: "Integer score from 1 to 10.",
          },
          explanation: {
            type: "STRING",
            description:
              "Short explanation tied to specific moments, with m:ss timestamps when possible.",
          },
          tips: {
            type: "ARRAY",
            minItems: "2",
            items: { type: "STRING" },
            description: "Concrete ways to improve this category.",
          },
        },
      },
    },
  },
};

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function canonicalName(value) {
  return CATEGORY_ALIASES[cleanString(value).toLowerCase()] ?? null;
}

function readScore(value) {
  const score = typeof value === "number" ? value : Number(cleanString(value));
  if (!Number.isFinite(score)) return null;
  const rounded = Math.round(score);
  if (rounded < 1 || rounded > 10) return null;
  return rounded;
}

function readTips(value) {
  if (Array.isArray(value)) return value.map(cleanString).filter(Boolean);
  const single = cleanString(value);
  return single ? [single] : [];
}

function parseJsonObject(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        // Fall through to the shared parse error.
      }
    }
  }
  throw new CritiqueError("model", modelMessage(), {
    detail: `Response was not valid JSON. It starts with: ${trimmed.slice(0, 240)}`,
    retryable: true,
  });
}

const BLOCKED_FINISH = new Set(["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"]);
const INCOMPLETE_FINISH = new Set(["MAX_TOKENS", "MALFORMED_FUNCTION_CALL", "OTHER", "LANGUAGE"]);

export function readGenerateResult(response) {
  const candidate = response?.candidates?.[0];
  const finishReason = String(candidate?.finishReason || "");
  const blockReason = String(response?.promptFeedback?.blockReason || "");
  const parts = candidate?.content?.parts;
  let text = "";
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (part?.thought === true) continue;
      if (typeof part?.text === "string") text += part.text;
    }
  }
  const usage = response?.usageMetadata || {};
  const thoughtsTokenCount = Number.isFinite(usage.thoughtsTokenCount) ? usage.thoughtsTokenCount : null;
  const candidatesTokenCount = Number.isFinite(usage.candidatesTokenCount)
    ? usage.candidatesTokenCount
    : null;
  const blocked = Boolean(blockReason) || BLOCKED_FINISH.has(finishReason);
  const incomplete = INCOMPLETE_FINISH.has(finishReason) || (!text.trim() && !blocked);
  return {
    text,
    finishReason,
    blockReason,
    thoughtsTokenCount,
    candidatesTokenCount,
    blocked,
    retryable: !blocked && (incomplete || !text.trim()),
  };
}

export function describeGenerateResult(result, note = "") {
  const lines = [];
  if (note) lines.push(note);
  if (result?.finishReason) lines.push(`finishReason: ${result.finishReason}`);
  if (result?.blockReason) lines.push(`blockReason: ${result.blockReason}`);
  if (result?.thoughtsTokenCount != null) lines.push(`thoughtsTokenCount: ${result.thoughtsTokenCount}`);
  if (result?.candidatesTokenCount != null) {
    lines.push(`candidatesTokenCount: ${result.candidatesTokenCount}`);
  }
  const snippet = typeof result?.text === "string" ? result.text.trim().slice(0, 500) : "";
  if (snippet) lines.push(`model text: ${snippet}`);
  return lines.join("\n");
}

export function parseCritique(payload) {
  let data = payload;
  if (typeof payload === "string") data = parseJsonObject(payload);

  if (!data || typeof data !== "object") {
    throw new CritiqueError("model", modelMessage(), {
      detail: "The model response was empty.",
      retryable: true,
    });
  }

  const summary = cleanString(data.summary);
  if (!summary) {
    throw new CritiqueError("model", modelMessage(), {
      detail: "The model JSON had no summary.",
      retryable: true,
    });
  }

  const addressedQuestion = cleanString(
    data.addressedQuestion ?? data.addressed_question ?? "",
  );
  const rawCategories = Array.isArray(data.categories) ? data.categories : [];
  const byName = new Map();

  for (const raw of rawCategories) {
    const name = canonicalName(raw?.name);
    if (!name || byName.has(name)) continue;
    const grade = cleanString(raw?.grade).toUpperCase().replace(/[^A-F]/g, "").slice(0, 1);
    const score = readScore(raw?.score);
    const explanation = cleanString(raw?.explanation);
    const tips = readTips(raw?.tips);
    if (!GRADES.includes(grade) || score == null || !explanation || tips.length === 0) {
      throw new CritiqueError("model", modelMessage(), {
        detail: `Couldn't read the ${name} category (grade, score, explanation, or tips).`,
        retryable: true,
      });
    }
    byName.set(name, { name, grade, score, explanation, tips });
  }

  if (byName.size !== CATEGORY_ORDER.length) {
    const found = [...byName.keys()].join(", ") || "none";
    throw new CritiqueError("model", modelMessage(), {
      detail: `The model JSON did not include all four categories. Found: ${found}.`,
      retryable: true,
    });
  }

  return {
    summary,
    addressedQuestion,
    categories: CATEGORY_ORDER.map((name) => byName.get(name)),
  };
}

function extractMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return [error.message, error.statusText, error.error?.message, error.cause?.message]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ");
}

function isAuthFailure(message, status) {
  const lower = message.toLowerCase();
  if (status === 401) return true;
  if (/api[_ ]?key/.test(lower) && /not valid|invalid|expired|missing|denied|unauthor/.test(lower)) {
    return true;
  }
  if (/api_key_invalid|permission_denied|unauthenticated/.test(lower)) return true;
  if (status === 403 && /api key|permission|denied|unauthor/.test(lower)) return true;
  if (status === 400 && /api key/.test(lower)) return true;
  return false;
}

export function toCritiqueError(error) {
  if (error instanceof CritiqueError) return error;
  if (error?.name === "AbortError") {
    return new CritiqueError("aborted", "Cancelled.", { detail: extractMessage(error) });
  }

  const message = extractMessage(error);
  const status = geminiHttpStatus(error);
  const detail = [status ? `HTTP ${status}` : "", message].filter(Boolean).join(" — ");
  if (isAuthFailure(message, status)) {
    return new CritiqueError("auth", rejectedKeyMessage(), { detail });
  }
  if (/failed to fetch|networkerror|network error|econn|timed out|timeout|offline/i.test(message)) {
    return new CritiqueError(
      "model",
      "Couldn't reach Gemini. Check your connection and try again.",
      { detail, retryable: true },
    );
  }
  return new CritiqueError("model", modelMessage(), {
    detail,
    retryable: isRetryableGeminiError(error),
  });
}

export function mockCritique(question) {
  const trimmed = typeof question === "string" ? question.trim() : "";
  return parseCritique({
    summary:
      "You answer in a clear arc and sound engaged at the end, but the middle speeds up and picks up fillers while your eyes leave the camera. Tightening the pace and bringing your gaze back would make this feel more confident.",
    addressedQuestion: trimmed
      ? `You mostly answered “${trimmed}”. The example is specific, but you never say what you would do differently, which the question asks for.`
      : "",
    categories: [
      {
        name: "Cadence (pacing)",
        grade: "B",
        score: 7,
        explanation:
          "You start steady, then rush from about 0:11 to 0:19 when you describe the fix. The close at 0:34 slows back down and is easier to follow.",
        tips: [
          "Pause after you name the problem, then give the one-sentence answer before the details.",
          "Mark the ending out loud and land it instead of speeding through the result.",
        ],
      },
      {
        name: "Eye contact",
        grade: "C",
        score: 6,
        explanation:
          "You look into the camera through the opening. Around 0:22 your eyes drop to the bottom of the frame and stay there through the example.",
        tips: [
          "Set the lens at eye level so looking at the camera doesn't feel like looking up.",
          "Glance away to think, then return to the lens before the next sentence.",
        ],
      },
      {
        name: "Filler words",
        grade: "C",
        score: 5,
        explanation:
          'There is an "um" at the start, a "like" around 0:08, and a string of "uh" between 0:24 and 0:29 while you search for the result.',
        tips: [
          "Replace the opening filler with a silent breath, then start on the first real word.",
          "If you need a moment, say nothing instead of filling it with uh.",
          "Jot three beats before you record so the middle of the story has a path.",
        ],
      },
      {
        name: "Intonation",
        grade: "B",
        score: 8,
        explanation:
          "Your voice lifts on the result around 0:31, which sounds engaged. The middle stays flat, especially the sentence that starts near 0:16.",
        tips: [
          "Stress the outcome word so the listener can hear what mattered.",
          "Let the last sentence fall at the end so the answer sounds finished.",
        ],
      },
    ],
  });
}

export function mockChatReply(message, critique) {
  const prompt = cleanString(message);
  const cadence = critique?.categories?.find(
    (item) => item.name === "Cadence (pacing)",
  );
  const moment = cadence?.explanation ?? "the pacing notes in your critique";
  return `On this recording, ${moment} For “${prompt}”, use the critique you already have: slow the rush around 0:11, bring your eyes back to the lens after 0:22, and swap the “uh” stretch from 0:24 to 0:29 for a short pause. I can walk through any of the four grades in more detail.`;
}
