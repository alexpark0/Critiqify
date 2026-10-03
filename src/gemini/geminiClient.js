import { GoogleGenAI } from "@google/genai";
import { CritiqueError, missingKeyMessage } from "./critiqueFormat.js";
import { geminiApiKey } from "./geminiEnv.js";

export function createGeminiClient(action) {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw new CritiqueError("missing_key", missingKeyMessage(action));
  }
  return new GoogleGenAI({ apiKey });
}
