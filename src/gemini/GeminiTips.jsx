import { GoogleGenerativeAI } from "@google/generative-ai";
import React, { useState } from "react";

const genAI = new GoogleGenerativeAI(process.env.VITE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

const GeminiTips = () => {
  const [search, setSearch] = useState("");

  const handleChangeSearch = (e) => {
    setSearch(e.target.value);
  };
  const [aiResponse, setResponse] = useState("");

  // Generative AI Call to fetch dishes

  async function aiRun() {
    const prompt = `respond in 1-5 sentences: ${search} `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    setResponse(text);
  }

  // button event trigger to consume gemini Api

  const handleClick = () => {
    aiRun();
  };

  return (
    <div>
      <div style={{ padding: "25px" }}>
        <input
          placeholder="Ask AI for tips!"
          style={{ width: "350px" }}
          onChange={(e) => handleChangeSearch(e)}
        />
        <button style={{ marginLeft: "20px" }} onClick={() => handleClick()}>
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
