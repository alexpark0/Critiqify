import { GoogleGenerativeAI } from "@google/generative-ai";
import React, { useState } from 'react';

const genAI = new GoogleGenerativeAI('AIzaSyAu9Sf7S0wM_DtPgyBfUNN5AAZAytgodgo');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const Gemini = () => {
  const [search, setSearch] = useState('');
  
  const handleChangeSearch = (e) => {
      setSearch(e.target.value);
  }
  const [aiResponse, setResponse] = useState('');

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
}
  
  return (
      <div>
        <div>
          <input placeholder='Ask AI for presentation tips!' style={{ width:"350px" }} onChange={(e) => handleChangeSearch(e)} />
          <button style={{ marginLeft: '20px' }} onClick={() => handleClick()}>Enter</button>
        </div>
        <div>
          <p>{aiResponse}</p>
        </div>
      </div>
  );
};

export default Gemini;
