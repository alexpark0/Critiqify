import { formatClock } from "../playback/time.js";

const FILLER =
  /\b(?:um+|uh+|er+|ah+|hmm+|like|you know|sort of|kind of|i mean)\b/gi;

export function speechRecognitionCtor(scope = globalThis) {
  if (!scope) return null;
  return scope.SpeechRecognition || scope.webkitSpeechRecognition || null;
}

export function cueFromFinalResult(transcript, elapsedSeconds) {
  const text = typeof transcript === "string" ? transcript.replace(/\s+/g, " ").trim() : "";
  const seconds = Number(elapsedSeconds);
  if (!text || !Number.isFinite(seconds) || seconds < 0) return null;
  return { seconds, text };
}

export function normalizeCues(cues) {
  if (!Array.isArray(cues)) return [];
  const next = [];
  for (const cue of cues) {
    const text = typeof cue?.text === "string" ? cue.text.replace(/\s+/g, " ").trim() : "";
    const seconds = Number(cue?.seconds);
    if (!text || !Number.isFinite(seconds) || seconds < 0) continue;
    next.push({ seconds, text });
  }
  next.sort((left, right) => left.seconds - right.seconds);
  return next;
}

export function renderTranscriptState(cues, question) {
  const lines = normalizeCues(cues).map((cue) => `[${formatClock(cue.seconds)}] ${cue.text}`);
  const trimmed = typeof question === "string" ? question.trim() : "";
  const header = trimmed
    ? `Practice question:\n${trimmed}`
    : "No practice question was provided.";
  if (lines.length === 0) return header;
  return `${header}\n\nTimestamped transcript:\n${lines.join("\n")}`;
}

export function fillerHits(cues) {
  const hits = [];
  for (const cue of normalizeCues(cues)) {
    const timestamp = formatClock(cue.seconds);
    for (const match of cue.text.matchAll(FILLER)) {
      hits.push({
        seconds: cue.seconds,
        word: match[0].toLowerCase(),
        timestamp,
      });
    }
  }
  return hits;
}

export function cadenceEvidence(cues) {
  const list = normalizeCues(cues);
  const pauses = [];
  const rushes = [];
  for (let index = 1; index < list.length; index += 1) {
    const previous = list[index - 1];
    const current = list[index];
    const gap = current.seconds - previous.seconds;
    if (gap >= 3.5) {
      pauses.push({
        seconds: current.seconds,
        gap,
        timestamp: formatClock(current.seconds),
      });
    }
    const words = previous.text.split(/\s+/).filter(Boolean).length;
    if (gap >= 0.4 && gap < 3.5 && words / gap >= 3.2) {
      rushes.push({
        seconds: previous.seconds,
        words,
        gap,
        timestamp: formatClock(previous.seconds),
      });
    }
  }
  return { pauses, rushes };
}

function resultTranscript(result) {
  if (!result) return "";
  const alternative = result[0] || (typeof result.item === "function" ? result.item(0) : null);
  if (alternative && typeof alternative.transcript === "string") return alternative.transcript;
  if (typeof result.transcript === "string") return result.transcript;
  return "";
}

/**
 * Wraps the browser SpeechRecognition object. Phrase stamps are seconds since
 * the first start(), including automatic restarts after a silence.
 */
export function attachSpeechRecognition(recognition, {
  onCue,
  onStatus,
  shouldRestart,
  now = () => Date.now(),
} = {}) {
  let origin = now();
  let stopped = true;

  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = recognition.lang || "en-US";

  recognition.onresult = (event) => {
    const elapsed = Math.max(0, (now() - origin) / 1000);
    const results = event?.results;
    if (!results) return;
    const start = Number.isFinite(event.resultIndex) ? event.resultIndex : 0;
    for (let index = start; index < results.length; index += 1) {
      const result = results[index];
      if (!result?.isFinal) continue;
      const cue = cueFromFinalResult(resultTranscript(result), elapsed);
      if (cue) onCue?.(cue);
    }
  };

  recognition.onerror = (event) => {
    const code = event?.error || "";
    if (code === "no-speech" || code === "aborted") return;
    if (code === "not-allowed" || code === "service-not-allowed") {
      onStatus?.(
        "Microphone transcription was blocked. Allow the microphone and record again so Jev can grade the words.",
      );
      return;
    }
    if (code === "network") {
      onStatus?.(
        "Live transcription needs a network connection in this browser. Jev may not get a transcript for this take.",
      );
      return;
    }
    onStatus?.("Live transcription stopped. Jev may not be able to grade this take.");
  };

  recognition.onend = () => {
    if (stopped || !shouldRestart?.()) return;
    try {
      recognition.start();
    } catch {
      onStatus?.("Live transcription stopped. Jev may not be able to grade this take.");
    }
  };

  return {
    start() {
      stopped = false;
      origin = now();
      recognition.start();
    },
    stop() {
      stopped = true;
      try {
        recognition.stop();
      } catch {
        // stop() throws if recognition never started.
      }
    },
  };
}
