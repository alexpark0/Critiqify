import { formatClock } from "../playback/time.js";

export const TELEPROMPTER_CUE = "Keep eyes near camera";

const PLACEHOLDER =
  "Generate a sample question, then read it here while you look just above the lens.";

export function teleprompterView({
  question = "",
  elapsedSeconds = 0,
  playbackSeconds = 0,
  mode = "idle",
} = {}) {
  const trimmed = typeof question === "string" ? question.trim() : "";
  const timerMode = mode === "recording" || mode === "playback" ? mode : "idle";
  const rawSeconds = timerMode === "recording" ? elapsedSeconds : timerMode === "playback" ? playbackSeconds : 0;
  const seconds = Number.isFinite(rawSeconds) && rawSeconds > 0 ? rawSeconds : 0;
  const clock = formatClock(seconds);
  const timerText = timerMode === "recording" ? `REC ${clock}` : clock;
  const timerLabel =
    timerMode === "recording"
      ? `Recording ${clock}`
      : timerMode === "playback"
        ? `Playback ${clock}`
        : `Timer ${clock}`;

  return {
    cue: TELEPROMPTER_CUE,
    question: trimmed || PLACEHOLDER,
    hasQuestion: Boolean(trimmed),
    generateLabel: trimmed ? "New sample question" : "Generate sample question",
    timerMode,
    timerText,
    timerLabel,
  };
}
