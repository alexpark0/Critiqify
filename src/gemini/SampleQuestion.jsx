import { GoogleGenerativeAI } from "@google/generative-ai";
import React, { useState } from "react";

const genAI = new GoogleGenerativeAI('${process.env.API_KEY}');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const SampleQuestion = () => {

  const [aiResponse, setResponse] = useState("");

  // Generative AI Call to fetch dishes

  async function aiRun() {
    const prompt = `give me a sample interview question. `;
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
