import { CritiqueError } from "../gemini/critiqueFormat.js";
import { normalizeCues, renderTranscriptState } from "../speech/liveTranscript.js";
import {
  JEV_MODEL,
  JEV_PROXY_PATH,
  jevFailureMessage,
  missingJevKeyMessage,
  missingTranscriptMessage,
  rejectedJevKeyMessage,
} from "./messages.js";
import { RubricError, buildQuestions, critiqueFromJev } from "./rubric.js";

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504, 529]);
const ATTEMPTS = 3;

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

function clip(text, status) {
  const body = typeof text === "string" ? text.trim().slice(0, 500) : "";
  return [status ? `HTTP ${status}` : "", body].filter(Boolean).join(" — ");
}

async function readBody(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function errorFromResponse(status, text) {
  const payload = parseJson(text);
  if (payload?.error === "missing_key") {
    return new CritiqueError("missing_jev_key", payload.message || missingJevKeyMessage(), {
      detail: clip(text, status),
    });
  }
  if (status === 401 || status === 403) {
    return new CritiqueError("jev_auth", rejectedJevKeyMessage(), {
      detail: clip(text, status),
    });
  }
  const tooLong = status === 413;
  return new CritiqueError("jev", tooLong ? "This transcript is too long for Jev. Record a shorter answer." : jevFailureMessage(), {
    detail: clip(text, status),
    retryable: !tooLong && RETRYABLE_STATUSES.has(status),
  });
}

export async function postSystemOne(body, {
  signal,
  onProgress,
  fetchImpl = globalThis.fetch,
  sleep = delay,
} = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    if (signal?.aborted) throw abortError();
    let response;
    try {
      response = await fetchImpl(JEV_PROXY_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (signal?.aborted || error?.name === "AbortError") throw abortError();
      lastError = new CritiqueError(
        "jev",
        "Couldn't reach Jev. Check your connection and try again.",
        { detail: error?.message || "", retryable: true },
      );
      if (attempt === ATTEMPTS) break;
      onProgress?.("retry");
      await sleep(1000 * attempt, signal);
      onProgress?.("grade");
      continue;
    }

    const text = await readBody(response);
    if (response.ok) {
      const payload = parseJson(text);
      if (!payload || typeof payload !== "object") {
        lastError = new CritiqueError("jev", jevFailureMessage(), {
          detail: "Jev returned a response that was not JSON.",
          retryable: true,
        });
      } else {
        return payload;
      }
    } else {
      lastError = errorFromResponse(response.status, text);
    }

    if (!lastError.retryable || attempt === ATTEMPTS) break;
    console.log("[critiqify] retrying jev", { attempt, status: response?.status });
    onProgress?.("retry");
    await sleep(1000 * attempt, signal);
    onProgress?.("grade");
  }
  throw lastError || new CritiqueError("jev", jevFailureMessage());
}

export async function gradeTranscript({
  cues,
  question = "",
  signal,
  onProgress,
  fetchImpl,
  sleep,
}) {
  const list = normalizeCues(cues);
  if (list.length === 0) {
    throw new CritiqueError("transcript", missingTranscriptMessage());
  }
  const body = {
    state: renderTranscriptState(list, question),
    model: JEV_MODEL,
    questions: buildQuestions(question),
  };
  const response = await postSystemOne(body, { signal, onProgress, fetchImpl, sleep });
  try {
    const critique = critiqueFromJev({ response, cues: list, question });
    console.log("[critiqify] jev graded", {
      model: critique.model,
      cadence: critique.categories[0]?.score,
      fillerWords: critique.categories[2]?.score,
    });
    return critique;
  } catch (error) {
    if (error instanceof RubricError) {
      throw new CritiqueError("jev", jevFailureMessage(), {
        detail: error.detail || error.message,
        retryable: true,
      });
    }
    throw error;
  }
}
