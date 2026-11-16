/**
 * Stable Gemini model with video and audio input plus structured JSON output.
 * Confirmed on the Gemini API model page (GA, September 2026): inputs include
 * video, output is text, and structured outputs are supported. Thinking defaults
 * to medium and counts against maxOutputTokens, so critique requests lower it.
 */
export const GEMINI_MODEL = "gemini-3.8-flash";

function viteValue(name) {
  // Name the keys statically. `import.meta.env` as a whole object makes Vite
  // inline every VITE_ variable, which would put the Jev key in the bundle.
  try {
    const value =
      name === "VITE_API_KEY"
        ? import.meta.env.VITE_API_KEY
        : name === "VITE_MOCK_GEMINI"
          ? import.meta.env.VITE_MOCK_GEMINI
          : "";
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

function readEnv(name) {
  const fromVite = viteValue(name);
  if (fromVite) return fromVite;
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
