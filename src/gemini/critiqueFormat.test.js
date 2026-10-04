import assert from "node:assert/strict";
import test from "node:test";
import {
  CATEGORY_ORDER,
  CritiqueError,
  FILE_API_MAX_BYTES,
  INLINE_VIDEO_MAX_BYTES,
  buildCritiquePrompt,
  critiqueResponseSchema,
  deliveryMode,
  isFileNotReadyError,
  isRetryableGeminiError,
  missingKeyMessage,
  mockChatReply,
  mockCritique,
  nextPollDelayMs,
  normalizeFileState,
  parseCritique,
  rejectedKeyMessage,
  titleForKind,
  toCritiqueError,
  unwrapGeminiFile,
} from "./critiqueFormat.js";

test("deliveryMode uses inline data for small clips and the Files API after that", () => {
  assert.equal(deliveryMode(0), "inline");
  assert.equal(deliveryMode(INLINE_VIDEO_MAX_BYTES), "inline");
  assert.equal(deliveryMode(INLINE_VIDEO_MAX_BYTES + 1), "files");
  assert.equal(deliveryMode(FILE_API_MAX_BYTES), "files");
  assert.equal(deliveryMode(FILE_API_MAX_BYTES + 1), "too-large");
  assert.equal(deliveryMode(Number.NaN), "too-large");
});

test("normalizeFileState does not treat a missing state as ready", () => {
  assert.equal(normalizeFileState(undefined), "PENDING");
  assert.equal(normalizeFileState(""), "PENDING");
  assert.equal(normalizeFileState("STATE_UNSPECIFIED"), "PENDING");
  assert.equal(normalizeFileState("processing"), "PROCESSING");
  assert.equal(normalizeFileState("ACTIVE"), "ACTIVE");
  assert.equal(normalizeFileState({ name: "FAILED" }), "FAILED");
});

test("unwrapGeminiFile reads a nested upload payload", () => {
  const file = { name: "files/abc", state: "PROCESSING", uri: "https://example/files/abc" };
  assert.equal(unwrapGeminiFile({ file }), file);
  assert.equal(unwrapGeminiFile(file), file);
});

test("poll delay backs off and then stays at eight seconds", () => {
  assert.equal(nextPollDelayMs(0), 1000);
  assert.equal(nextPollDelayMs(1000), 2000);
  assert.equal(nextPollDelayMs(4000), 8000);
  assert.equal(nextPollDelayMs(8000), 8000);
});

test("retryable Gemini errors are 429 and 5xx, not a normal 400", () => {
  const busy = Object.assign(new Error("unavailable"), { status: 503 });
  const limited = Object.assign(new Error("slow down"), { status: 429 });
  const badRequest = Object.assign(new Error("invalid json"), { status: 400 });
  assert.equal(isRetryableGeminiError(busy), true);
  assert.equal(isRetryableGeminiError(limited), true);
  assert.equal(isRetryableGeminiError(badRequest), false);
  assert.equal(
    isFileNotReadyError(new Error("File is not in an ACTIVE state and still processing")),
    true,
  );
  assert.equal(isFileNotReadyError(badRequest), false);
});

test("buildCritiquePrompt includes the sample question when one is shown", () => {
  const withQuestion = buildCritiquePrompt("Tell me about a bug you fixed.");
  assert.match(withQuestion, /Tell me about a bug you fixed/);
  assert.match(withQuestion, /Cadence \(pacing\)/);
  assert.match(withQuestion, /Eye contact/);
  assert.match(withQuestion, /Filler words/);
  assert.match(withQuestion, /Intonation/);

  const withoutQuestion = buildCritiquePrompt("  ");
  assert.match(withoutQuestion, /No practice question was provided/);
  assert.doesNotMatch(withoutQuestion, /Tell me about/);
});

test("response schema requires the four critique categories", () => {
  assert.deepEqual(
    critiqueResponseSchema.properties.categories.items.properties.name.enum,
    CATEGORY_ORDER,
  );
  assert.deepEqual(critiqueResponseSchema.required, [
    "summary",
    "addressedQuestion",
    "categories",
  ]);
});

test("parseCritique accepts JSON, fences, and a shuffled category list", () => {
  const critique = mockCritique("How would you debug a slow endpoint?");
  const shuffled = {
    ...critique,
    categories: [...critique.categories].reverse(),
  };
  const parsed = parseCritique(`\`\`\`json\n${JSON.stringify(shuffled)}\n\`\`\``);
  assert.deepEqual(
    parsed.categories.map((category) => category.name),
    CATEGORY_ORDER,
  );
  assert.match(parsed.addressedQuestion, /slow endpoint/);
  assert.equal(parsed.categories[0].grade, "B");
});

test("parseCritique rejects a response that drops a category", () => {
  const critique = mockCritique("");
  critique.categories = critique.categories.slice(0, 3);
  assert.throws(() => parseCritique(critique), (error) => {
    assert.equal(error instanceof CritiqueError, true);
    assert.equal(error.kind, "model");
    return true;
  });
});

test("mock critique without a question leaves addressedQuestion empty", () => {
  const critique = mockCritique("");
  assert.equal(critique.addressedQuestion, "");
  assert.equal(critique.categories.length, 4);
});

test("mock chat reply stays on this recording and the critique", () => {
  const critique = mockCritique("Tell me about a bug.");
  const reply = mockChatReply("How do I cut the fillers at the start?", critique);
  assert.match(reply, /0:11/);
  assert.match(reply, /How do I cut the fillers at the start/);
  assert.match(reply, /recording/);
});

test("toCritiqueError distinguishes a bad key, an abort, and a model failure", () => {
  const expired = toCritiqueError(
    Object.assign(new Error("API key expired. Please renew the API key."), {
      status: 400,
    }),
  );
  assert.equal(expired.kind, "auth");
  assert.match(expired.message, /expired/);

  const invalid = toCritiqueError(
    new Error("[400 Bad Request] API key not valid. Please pass a valid API key."),
  );
  assert.equal(invalid.kind, "auth");

  const aborted = toCritiqueError(
    Object.assign(new Error("The operation was aborted"), { name: "AbortError" }),
  );
  assert.equal(aborted.kind, "aborted");

  const model = toCritiqueError(new Error("Model is overloaded"));
  assert.equal(model.kind, "model");

  const preserved = new CritiqueError("upload", "upload failed");
  assert.equal(toCritiqueError(preserved), preserved);
});

test("key messages point at AI Studio and VITE_API_KEY", () => {
  assert.match(missingKeyMessage("requesting a critique"), /VITE_API_KEY/);
  assert.match(missingKeyMessage("requesting a critique"), /aistudio\.google\.com\/apikey/);
  assert.match(rejectedKeyMessage(), /invalid or expired/);
  assert.equal(titleForKind("missing_key"), "Gemini API key needed");
  assert.equal(titleForKind("upload"), "Upload failed");
});
