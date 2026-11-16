import assert from "node:assert/strict";
import test from "node:test";
import { CritiqueError } from "../gemini/critiqueFormat.js";
import { gradeTranscript, postSystemOne } from "./jevClient.js";
import { JEV_PROXY_PATH } from "./messages.js";

const CUES = [{ seconds: 2, text: "um I checked the logs and fixed the null pointer" }];

function jevBody() {
  return {
    model: "jev-1.13.0",
    answers: {
      cadence: {
        type: "score",
        score: 4,
        confidence: 0.9,
        legend: { 0: "run-on", 1: "several", 2: "mixed", 3: "mostly", 4: "even" },
        probabilities: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 1 },
      },
      fillerWords: {
        type: "score",
        score: 0,
        confidence: 0.8,
        legend: { 0: "most phrases", 1: "several", 2: "handful", 3: "single", 4: "none" },
        probabilities: { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0 },
      },
      addressed: { type: "noul", noul: 0.91 },
    },
    usage: { input_tokens: 40, output_tokens: 8 },
  };
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("grading posts the transcript to the proxy and does not send an API key", async () => {
  const calls = [];
  const critique = await gradeTranscript({
    cues: CUES,
    question: "Tell me about a bug.",
    sleep: async () => {},
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(200, jevBody());
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, JEV_PROXY_PATH);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.authorization, undefined);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, "jev-latest");
  assert.equal(body.questions.cadence.type, "score");
  assert.equal(body.questions.fillerWords.type, "score");
  assert.equal(body.questions.addressed.type, "noul");
  assert.match(body.state, /\[0:02\] um I checked the logs/);
  assert.equal(critique.categories[0].score, 10);
  assert.equal(critique.categories[1].unavailable, true);
  assert.equal(critique.categories[2].score, 1);
  assert.match(critique.categories[2].explanation, /um at 0:02/);
});

test("an empty transcript never calls Jev", async () => {
  let calls = 0;
  await assert.rejects(
    () => gradeTranscript({ cues: [], fetchImpl: async () => { calls += 1; } }),
    (error) => {
      assert.equal(error instanceof CritiqueError, true);
      assert.equal(error.kind, "transcript");
      assert.match(error.message, /transcript/);
      return true;
    },
  );
  assert.equal(calls, 0);
});

test("a missing key is shown once and is not retried", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      postSystemOne(
        { state: "hello", model: "jev-latest", questions: {} },
        {
          sleep: async () => {},
          fetchImpl: async () => {
            calls += 1;
            return jsonResponse(503, {
              error: "missing_key",
              message: "Add a Jev API key before grading. Set VITE_JEV_API_KEY.",
            });
          },
        },
      ),
    (error) => {
      assert.equal(error.kind, "missing_jev_key");
      assert.match(error.message, /VITE_JEV_API_KEY/);
      return true;
    },
  );
  assert.equal(calls, 1);
});

test("429 and 529 are retried, and a 400 is not", async () => {
  const statuses = [429, 529, 200];
  const seen = [];
  const phases = [];
  const payload = await postSystemOne(
    { state: "hello", model: "jev-latest", questions: { cadence: { type: "score" } } },
    {
      onProgress: (phase) => phases.push(phase),
      sleep: async () => {},
      fetchImpl: async () => {
        const status = statuses[seen.length];
        seen.push(status);
        if (status === 200) return jsonResponse(200, jevBody());
        return jsonResponse(status, { detail: "busy" });
      },
    },
  );
  assert.deepEqual(seen, [429, 529, 200]);
  assert.equal(payload.model, "jev-1.13.0");
  assert.deepEqual(phases, ["retry", "grade", "retry", "grade"]);

  let badCalls = 0;
  await assert.rejects(
    () =>
      postSystemOne(
        { state: "hello", model: "jev-latest", questions: {} },
        {
          sleep: async () => {
            throw new Error("should not retry");
          },
          fetchImpl: async () => {
            badCalls += 1;
            return jsonResponse(400, { detail: "questions must include criteria" });
          },
        },
      ),
    (error) => {
      assert.equal(error.kind, "jev");
      assert.equal(error.retryable, false);
      assert.match(error.detail, /HTTP 400/);
      assert.match(error.detail, /criteria/);
      return true;
    },
  );
  assert.equal(badCalls, 1);
});

test("a rejected key is not retried", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      postSystemOne(
        { state: "hello", model: "jev-latest", questions: {} },
        {
          sleep: async () => {},
          fetchImpl: async () => {
            calls += 1;
            return jsonResponse(401, { detail: { message: "invalid api key" } });
          },
        },
      ),
    (error) => {
      assert.equal(error.kind, "jev_auth");
      assert.match(error.message, /rejected/);
      return true;
    },
  );
  assert.equal(calls, 1);
});
