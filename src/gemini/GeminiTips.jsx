import { GoogleGenerativeAI } from "@google/generative-ai";
import React, { useState } from "react";

const GeminiTips = () => {
  const [search, setSearch] = useState("");
  const [aiResponse, setResponse] = useState("");
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);

  const handleChangeSearch = (e) => {
    setSearch(e.target.value);
  };

  async function aiRun() {
    if (!genAI) {
      console.error("GoogleGenerativeAI instance is not initialized.");
      return;
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent({ contents: [{ parts: [{ text: search }] }] });
      const response = await result.response;
      const text = response.text();
      setResponse(text);
    } catch (error) {
      console.error("Error generating content:", error);
    }
  }

  return (
    <div>
      <div style={{ padding: "25px" }}>
        <input
          placeholder="Ask AI for tips!"
          style={{ width: "350px" }}
          onChange={(e) => handleChangeSearch(e)}
        />
        <button style={{ marginLeft: "20px" }} onClick={aiRun}>
          Enter
        </button>
      </div>
      <div>
        <p>{aiResponse}</p>
      </div>
    </div>
  );
};

export default GeminiTips;
