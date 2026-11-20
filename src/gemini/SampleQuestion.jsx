import { useState } from "react";
import PropTypes from "prop-types";
import { teleprompterView } from "../record/teleprompter.js";
import { createGeminiClient } from "./geminiClient.js";
import { toCritiqueError } from "./critiqueFormat.js";
import { GEMINI_MODEL, isMockGemini } from "./geminiEnv.js";
import {
  initialSampleVariant,
  mockSampleQuestion,
  sampleQuestionPrompt,
} from "./sampleQuestions.js";
import GeminiAlert from "./GeminiAlert.jsx";

const SampleQuestion = ({
  onQuestion,
  question = "",
  elapsedSeconds = 0,
  playbackSeconds = 0,
  mode = "idle",
}) => {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [variant, setVariant] = useState(() => initialSampleVariant(question));
  const prompt = teleprompterView({
    question,
    elapsedSeconds,
    playbackSeconds,
    mode,
  });

  async function aiRun() {
    setStatus("loading");
    setError(null);
    const current = variant;
    try {
      let text = "";
      if (isMockGemini()) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        text = mockSampleQuestion(current);
      } else {
        const ai = createGeminiClient("generating a question");
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: sampleQuestionPrompt(current, question),
        });
        text = typeof response.text === "string" ? response.text.trim() : "";
        if (!text) {
          throw new Error("Gemini returned an empty question.");
        }
      }
      onQuestion?.(text);
      setVariant((index) => index + 1);
      setStatus("ready");
    } catch (caught) {
      const parsed = toCritiqueError(caught);
      if (parsed.kind === "model") {
        setError({
          kind: "model",
          message:
            "Couldn't generate a question. The AI service may be unavailable.",
        });
      } else {
        setError(parsed);
      }
      setStatus("error");
    }
  }

  return (
    <section className="teleprompter" aria-label="Teleprompter">
      <div className="teleprompter-bar">
        <p className="teleprompter-cue">{prompt.cue}</p>
        <span
          className={`timer-pill is-${prompt.timerMode}`}
          role="timer"
          aria-label={prompt.timerLabel}
        >
          {prompt.timerMode === "recording" ? (
            <span className="recording-dot" aria-hidden="true" />
          ) : null}
          {prompt.timerText}
        </span>
        <button type="button" onClick={aiRun} disabled={status === "loading"}>
          {status === "loading" ? "Generating…" : prompt.generateLabel}
        </button>
      </div>
      {status === "loading" ? (
        <p className="status" role="status">
          Asking for a practice question…
        </p>
      ) : null}
      {error ? <GeminiAlert kind={error.kind} message={error.message} /> : null}
      <p
        className={
          prompt.hasQuestion
            ? "teleprompter-question"
            : "teleprompter-question is-placeholder"
        }
      >
        {prompt.question}
      </p>
    </section>
  );
};

export default SampleQuestion;

SampleQuestion.propTypes = {
  onQuestion: PropTypes.func,
  question: PropTypes.string,
  elapsedSeconds: PropTypes.number,
  playbackSeconds: PropTypes.number,
  mode: PropTypes.string,
};
