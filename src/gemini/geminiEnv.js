/** Current Gemini model with video and audio input plus structured JSON output. */
export const GEMINI_MODEL = "gemini-3.8-flash";

export function geminiApiKey() {
  const value = import.meta.env.VITE_API_KEY;
  return typeof value === "string" ? value.trim() : "";
}

export function isMockGemini() {
  return import.meta.env.VITE_MOCK_GEMINI === "true";
}
