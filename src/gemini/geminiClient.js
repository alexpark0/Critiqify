import { GoogleGenAI } from "@google/genai";
import { CritiqueError, missingKeyMessage } from "./critiqueFormat.js";
import { geminiApiKey } from "./geminiEnv.js";

const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

export function createGeminiClient(action) {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw new CritiqueError("missing_key", missingKeyMessage(action));
  }
  return new GoogleGenAI({
    apiKey,
    // Stay on the Gemini Developer API version this app was written and tested
    // against. SDK 3.x defaults to v1, and some models and file-upload calls
    // still exist only on v1beta.
    apiVersion: "v1beta",
    httpOptions: {
      timeout: REQUEST_TIMEOUT_MS,
      retryOptions: {
        attempts: 5,
        initialDelay: 1,
        maxDelay: 20,
        expBase: 2,
        jitter: 1,
        httpStatusCodes: [408, 429, 500, 502, 503, 504],
      },
    },
  });
}
