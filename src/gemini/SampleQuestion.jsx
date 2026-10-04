import { useState } from "react";
import PropTypes from "prop-types";
import { createGeminiClient } from "./geminiClient.js";
import { toCritiqueError } from "./critiqueFormat.js";
import { GEMINI_MODEL, isMockGemini } from "./geminiEnv.js";
import GeminiAlert from "./GeminiAlert.jsx";

const MOCK_QUESTIONS = [
  "Tell me about a time you diagnosed a tricky bug in a service you owned, and how you decided what to fix first.",
  "Describe a time you disagreed with a teammate about a technical decision. How did you resolve it?",
];

const PROMPT =
  "give me a sample interview question for a software engineering internship. respond in one sentence.";

const SampleQuestion = ({ onQuestion }) => {
  const [aiResponse, setResponse] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [mockIndex, setMockIndex] = useState(0);

  async function aiRun() {
    setStatus("loading");
    setError(null);
    try {
      let text = "";
      if (isMockGemini()) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        text = MOCK_QUESTIONS[mockIndex % MOCK_QUESTIONS.length];
        setMockIndex((index) => index + 1);
      } else {
        const ai = createGeminiClient("generating a question");
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: PROMPT,
        });
        text = typeof response.text === "string" ? response.text.trim() : "";
        if (!text) {
          throw new Error("Gemini returned an empty question.");
        }
      }
      setResponse(text);
      onQuestion?.(text);
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
    <div>
      <button type="button" onClick={aiRun} disabled={status === "loading"}>
        {status === "loading" ? "Generating…" : "Generate Interview Question"}
      </button>
      {status === "loading" ? (
        <p className="status" role="status">
          Asking for a practice question…
        </p>
      ) : null}
      {error ? <GeminiAlert kind={error.kind} message={error.message} /> : null}
      {aiResponse ? (
        <p className="ai-response" aria-live="polite">
          {aiResponse}
        </p>
      ) : null}
    </div>
  );
};

export default SampleQuestion;

SampleQuestion.propTypes = {
  onQuestion: PropTypes.func,
};
