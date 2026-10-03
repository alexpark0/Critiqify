import { GoogleGenerativeAI } from "@google/generative-ai";
import { useState } from "react";

const GeminiTips = () => {
  const [search, setSearch] = useState("");
  const [aiResponse, setResponse] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);

  const handleChangeSearch = (e) => {
    setSearch(e.target.value);
  };

  async function aiRun() {
    const prompt = search.trim();
    if (!prompt) {
      setError("Enter a question or a description of your presentation first.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });
      const response = await result.response;
      const text = response.text();
      setResponse(text);
      setStatus("ready");
    } catch {
      setStatus("error");
      setError(
        "Couldn't get tips right now. The AI service may be unavailable.",
      );
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        aiRun();
      }}
    >
      <div className="inline-field">
        <div className="grow">
          <label htmlFor="ai-tips">What should the AI critique?</label>
          <input
            id="ai-tips"
            placeholder="Ask AI for tips!"
            value={search}
            onChange={handleChangeSearch}
          />
        </div>
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Thinking…" : "Enter"}
        </button>
      </div>
      {status === "loading" ? (
        <p className="status" role="status">
          Getting feedback…
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
    </form>
  );
};

export default GeminiTips;
