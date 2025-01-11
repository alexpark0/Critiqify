import { GoogleGenerativeAI } from "@google/generative-ai";
import React, { useState } from "react";

const SampleQuestion = () => {
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


  // Generative AI Call to fetch questions
  async function aiRun() {
    const prompt = `give me a sample interview question for a software engineering internship. respond in one sentence.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    setResponse(text);
  }

  // button to consume gemini Api
  const handleClick = () => {
    aiRun();
  };

  return (
    <div>
      <div>
        <button style={{ marginLeft: "20px" }} onClick={() => handleClick()}>
          Generate Interview Question
        </button>
      </div>
      <div>
        <p>{aiResponse}</p>
      </div>
    </div>
  );
};

export default SampleQuestion;
