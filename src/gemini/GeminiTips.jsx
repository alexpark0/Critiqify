import { GoogleGenerativeAI } from "@google/generative-ai";
import React, { useState } from "react";

const GeminiTips = () => {
  const [search, setSearch] = useState("");
  const [aiResponse, setResponse] = useState("");
  const [genAI, setGenAI] = useState(null);

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  useEffect(() => {
    async function fetchAPIKey() {
      try {
        const response = await fetch("/.netlify/functions/fetchData");
        const data = await response.json();

        if (data.error) {
          console.error("Error fetching API Key:", data.error);
          return;
        }

        // Initialize the Generative AI model with the received API key
        const genAIInstance = new GoogleGenerativeAI(data.apiKey);
        setGenAI(genAIInstance);
      } catch (error) {
        console.error("Error:", error);
      }
    }
    fetchAPIKey();
  }, []);

  // Generative AI Call
  async function aiRun() {
    const prompt = `respond in 1-5 sentences: ${search} `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    setResponse(text);
  }

  const handleChangeSearch = (e) => {
    setSearch(e.target.value);
  };

  // button to consume gemini Api
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
