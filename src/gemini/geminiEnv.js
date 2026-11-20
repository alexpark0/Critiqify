/**
 * Gemini model with video and audio input plus structured JSON output.
 * gemini-3.8-flash is still listed, but a free-tier generateContent call to it
 * returns HTTP 503 "This model is currently experiencing high demand" and has
 * kept doing so. gemini-3.5-flash-lite is on the same v1beta model list, accepts
 * video/webm (picture and audio), JSON schema, and thinking level LOW, and
 * returns a normal response. Critique requests still lower thinking so those
 * tokens do not eat the output limit.
 */
export const GEMINI_MODEL = "gemini-3.5-flash-lite";

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
