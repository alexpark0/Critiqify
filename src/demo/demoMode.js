import { mockSampleQuestion } from "../gemini/sampleQuestions.js";

export const DEMO_QUESTION = mockSampleQuestion(0);

export const DEMO_VIDEO_SRC = "/demo-take.webm";

export function isDemoMode(search) {
  const query =
    typeof search === "string"
      ? search
      : typeof window !== "undefined"
        ? window.location.search
        : "";
  return (
    new URLSearchParams(
      query.startsWith("?") || query === "" ? query : `?${query}`,
    ).get("demo") === "1"
  );
}
