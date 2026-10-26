export const DEMO_QUESTION =
  "Tell me about a time you diagnosed a tricky bug in a service you owned, and how you decided what to fix first.";

export const DEMO_VIDEO_SRC = "/demo-take.webm";

export function isDemoMode(search) {
  const query =
    typeof search === "string"
      ? search
      : typeof window !== "undefined"
        ? window.location.search
        : "";
  return new URLSearchParams(query.startsWith("?") || query === "" ? query : `?${query}`).get("demo") === "1";
}
