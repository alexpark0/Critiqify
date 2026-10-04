/**
 * Stable Gemini model with video and audio input plus structured JSON output.
 * Confirmed on the Gemini API model page (GA, September 2026): inputs include
 * video, output is text, and structured outputs are supported. Thinking defaults
 * to medium and counts against maxOutputTokens, so critique requests lower it.
 */
export const GEMINI_MODEL = "gemini-3.8-flash";

function readEnv(name) {
  const viteEnv = import.meta.env;
  if (viteEnv && typeof viteEnv === "object") {
    const value = viteEnv[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const nodeProcess = globalThis.process;
  if (nodeProcess?.env && typeof nodeProcess.env[name] === "string") {
    return nodeProcess.env[name].trim();
  }
  return "";
}

export function geminiApiKey() {
  return readEnv("VITE_API_KEY");
}

export function isMockGemini() {
  return readEnv("VITE_MOCK_GEMINI") === "true";
}
