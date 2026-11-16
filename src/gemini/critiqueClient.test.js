import assert from "node:assert/strict";
import test from "node:test";
import { startCritiqueSession } from "./critiqueClient.js";
import { CritiqueError } from "./critiqueFormat.js";

const nodeEnv = globalThis.process.env;

function videoFile() {
  return new File([new Uint8Array(512)], "answer.webm", { type: "video/webm" });
}

function jevBody() {
  return {
    model: "jev-1.13.0",
    answers: {
      cadence: {
        type: "score",
        score: 3,
        confidence: 0.8,
        legend: { 0: "run-on", 1: "several", 2: "mixed", 3: "mostly", 4: "even" },
        probabilities: { 0: 0, 1: 0, 2: 0.2, 3: 0.8, 4: 0 },
      },
      fillerWords: {
        type: "score",
        score: 2,
        confidence: 0.5,
        legend: { 0: "most", 1: "several", 2: "handful", 3: "single", 4: "none" },
        probabilities: { 0: 0, 1: 0.2, 2: 0.6, 3: 0.2, 4: 0 },
      },
      addressed: { type: "noul", noul: 0.66 },
    },
    usage: { input_tokens: 80, output_tokens: 12 },
  };
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function withEnv(updates, run) {
  const previous = {};
  for (const [key, value] of Object.entries(updates)) {
    previous[key] = nodeEnv[key];
    if (value == null) delete nodeEnv[key];
    else nodeEnv[key] = value;
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) delete nodeEnv[key];
      else nodeEnv[key] = value;
    }
  }
}

test("demo mode and mock mode grade without calling Jev", async () => {
  await withEnv({ VITE_API_KEY: null, VITE_MOCK_GEMINI: null, VITE_JEV_API_KEY: null }, async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      throw new Error("network");
    };
    const demo = await startCritiqueSession({
      videoFile: videoFile(),
      question: "Tell me about a bug.",
      demo: true,
      fetchImpl,
      sleep: async () => {},
    });
    assert.equal(calls, 0);
    assert.equal(demo.critique.categories[1].unavailable, true);
    const reply = await demo.ask("How do I cut the fillers?");
    assert.match(reply, /0:11/);
    assert.match(reply, /not graded/i);

    nodeEnv.VITE_MOCK_GEMINI = "true";
    const mock = await startCritiqueSession({
      videoFile: videoFile(),
      question: "",
      fetchImpl,
      sleep: async () => {},
    });
    assert.equal(calls, 0);
    assert.equal(mock.critique.categories[3].name, "Intonation");
    assert.equal(mock.critique.categories[3].unavailable, true);
  });
});

test("a recording without a transcript does not call Jev", async () => {
  await withEnv({ VITE_MOCK_GEMINI: null }, async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        startCritiqueSession({
          videoFile: videoFile(),
          transcript: [],
          transcriptNote: "This browser can't transcribe while you record.",
          fetchImpl: async () => {
            calls += 1;
          },
          sleep: async () => {},
        }),
      (error) => {
        assert.equal(error instanceof CritiqueError, true);
        assert.equal(error.kind, "transcript");
        assert.match(error.message, /can't transcribe/);
        return true;
      },
    );
    assert.equal(calls, 0);
  });
});

test("a live take is graded from the mocked Jev response and the coach still answers", async () => {
  await withEnv({ VITE_API_KEY: null, VITE_MOCK_GEMINI: null }, async () => {
    const calls = [];
    const phases = [];
    const session = await startCritiqueSession({
      videoFile: videoFile(),
      question: "Tell me about a bug.",
      transcript: [
        { seconds: 2, text: "um I checked the logs" },
        { seconds: 11, text: "then I rushed the fix" },
      ],
      onProgress: (phase) => phases.push(phase),
      sleep: async () => {},
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        assert.equal(String(url).includes("generativelanguage.googleapis.com"), false);
        assert.equal(String(url).includes("api.typesafe.ai"), false);
        return jsonResponse(200, jevBody());
      },
    });
    assert.deepEqual(phases, ["grade"]);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/jev");
    assert.equal(session.critique.categories[0].name, "Cadence (pacing)");
    assert.equal(session.critique.categories[1].score, null);
    assert.match(session.critique.addressedQuestion, /66 percent/);

    let coachCalls = 0;
    const local = await session.ask("Did my eyes stay on the camera?");
    assert.equal(coachCalls, 0);
    assert.match(local, /Not graded/);
    assert.match(local, /cannot see/);
  });
});

test("coach chat uses Gemini only when a Gemini key is set", async () => {
  await withEnv({ VITE_API_KEY: "test-gemini-key", VITE_MOCK_GEMINI: null }, async () => {
    const session = await startCritiqueSession({
      videoFile: videoFile(),
      question: "Tell me about a bug.",
      transcript: [{ seconds: 4, text: "I fixed the null pointer" }],
      sleep: async () => {},
      fetchImpl: async () => jsonResponse(200, jevBody()),
      completeCoach: async ({ message, transcriptText }) => {
        assert.match(transcriptText, /\[0:04\] I fixed the null pointer/);
        assert.match(message, /redo/);
        return "Redo the middle sentence.";
      },
    });
    const reply = await session.ask("What should I redo?");
    assert.equal(reply, "Redo the middle sentence.");
  });
});

test("the proxy missing-key response is shown and not retried by the session", async () => {
  await withEnv({ VITE_MOCK_GEMINI: null, VITE_API_KEY: null }, async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        startCritiqueSession({
          videoFile: videoFile(),
          transcript: [{ seconds: 1, text: "I checked the logs" }],
          sleep: async () => {},
          fetchImpl: async () => {
            calls += 1;
            return jsonResponse(503, {
              error: "missing_key",
              message: "Add a Jev API key before grading. Set VITE_JEV_API_KEY in .env.",
            });
          },
        }),
      (error) => {
        assert.equal(error.kind, "missing_jev_key");
        assert.match(error.message, /VITE_JEV_API_KEY/);
        return true;
      },
    );
    assert.equal(calls, 1);
  });
});
