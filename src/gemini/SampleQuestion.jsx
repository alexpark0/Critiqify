import { GoogleGenerativeAI } from "@google/generative-ai";
import { useState } from "react";

const SampleQuestion = () => {
  const [aiResponse, setResponse] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);

  async function aiRun() {
    setStatus("loading");
    setError("");
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const prompt = `give me a sample interview question for a software engineering internship. respond in one sentence.`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      setResponse(text);
      setStatus("ready");
    } catch {
      setStatus("error");
      setResponse("");
      setError(
        "Couldn't generate a question. The AI service may be unavailable.",
      );
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
      {error ? (
        <p className="status status-error" role="alert">
          {error}
        </p>
      ) : null}
      {aiResponse ? (
        <p className="ai-response" aria-live="polite">
          {aiResponse}
        </p>
      ) : null}
    </div>
  );
};

export default SampleQuestion;
