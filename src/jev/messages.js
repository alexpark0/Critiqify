export const JEV_KEY_URL = "https://console.typesafe.ai/keys";

export const JEV_MODEL = "jev-latest";

export const JEV_UPSTREAM_URL = "https://api.typesafe.ai/v1/systemone";

export const JEV_PROXY_PATH = "/api/jev";

export function readJevApiKey(env = {}) {
  const named = env.JEV_API_KEY || env.VITE_JEV_API_KEY || "";
  return typeof named === "string" ? named.trim() : "";
}

export function missingJevKeyMessage() {
  return `Add a Jev API key before grading. Create one at ${JEV_KEY_URL}, set VITE_JEV_API_KEY in .env (or JEV_API_KEY on Netlify), and restart the dev server. The browser calls ${JEV_PROXY_PATH}; the key stays on the server.`;
}

export function rejectedJevKeyMessage() {
  return `The Jev API key was rejected. It may be invalid or expired. Create a new key at ${JEV_KEY_URL}, update VITE_JEV_API_KEY in .env or JEV_API_KEY on Netlify, and restart the dev server.`;
}

export function jevFailureMessage() {
  return "Jev couldn't finish this grade. The service may be busy, or the response couldn't be read. Try again.";
}

export function missingTranscriptMessage() {
  return "Jev grades a transcript, not the video. This take has no transcript. Record again in Chrome or Edge, allow the microphone, and speak after you press Start.";
}
