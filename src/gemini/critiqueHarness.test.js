import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { INLINE_VIDEO_MAX_BYTES } from "./critiqueFormat.js";
import { GEMINI_MODEL } from "./geminiEnv.js";
import { startCritiqueSession } from "./critiqueClient.js";

const nodeEnv = globalThis.process.env;
nodeEnv.VITE_API_KEY = "test-key";
delete nodeEnv.VITE_MOCK_GEMINI;

const UPLOAD_URL = "https://generativelanguage.googleapis.com/upload/session/critiqify-clip";
const FILE_NAME = "files/critiqify-clip";
const FILE_URI = "https://generativelanguage.googleapis.com/v1beta/files/critiqify-clip";

function recordedWebmPath() {
  const path = join(tmpdir(), "critiqify-answer-30s.webm");
  if (!existsSync(path) || readFileSync(path).length < 1000) {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=320x240:rate=15",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:sample_rate=48000",
        "-t",
        "30",
        "-c:v",
        "libvpx",
        "-deadline",
        "realtime",
        "-cpu-used",
        "8",
        "-b:v",
        "200k",
        "-c:a",
        "libopus",
        "-b:a",
        "32k",
        "-f",
        "webm",
        path,
      ],
      { stdio: "pipe" },
    );
  }
  return path;
}

function recordedWebmBytes() {
  return readFileSync(recordedWebmPath());
}

function validCritiqueText() {
  return JSON.stringify({
    summary: "The close is clear, and the middle rushes.",
    addressedQuestion: "You answered the bug question with a specific example.",
    categories: [
      {
        name: "Cadence (pacing)",
        grade: "B",
        score: 7,
        explanation: "You rush from 0:11 to 0:19.",
        tips: ["Pause after the problem.", "Land the last sentence."],
      },
      {
        name: "Eye contact",
        grade: "C",
        score: 6,
        explanation: "Your eyes drop around 0:22.",
        tips: ["Return to the lens before the next sentence."],
      },
      {
        name: "Filler words",
        grade: "C",
        score: 5,
        explanation: "There is an um at the start.",
        tips: ["Start on the first real word."],
      },
      {
        name: "Intonation",
        grade: "B",
        score: 8,
        explanation: "Your voice lifts on the result near 0:31.",
        tips: ["Stress the outcome word."],
      },
    ],
  });
}

function generateBody({
  text = "",
  finishReason = "STOP",
  blockReason = "",
  thoughtsTokenCount = 80,
  candidatesTokenCount = 120,
  thoughtText = "",
} = {}) {
  const parts = [];
  if (thoughtText) parts.push({ text: thoughtText, thought: true });
  if (text) parts.push({ text });
  const payload = {
    candidates: [
      {
        finishReason,
        content: { role: "model", parts },
      },
    ],
    usageMetadata: { thoughtsTokenCount, candidatesTokenCount },
  };
  if (blockReason) payload.promptFeedback = { blockReason };
  return payload;
}

function jsonResponse(status, payload, extraHeaders = {}) {
  return new Response(payload == null ? null : JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      ...extraHeaders,
    },
  });
}

function installFetch(handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const href = String(url);
    const headers = init.headers;
    const command =
      typeof headers?.get === "function" ? headers.get("x-goog-upload-command") || "" : "";
    const contentType =
      typeof headers?.get === "function"
        ? headers.get("x-goog-upload-header-content-type") || ""
        : "";
    calls.push({ href, method: init.method || "GET", command, contentType });
    return handler({ href, method: init.method || "GET", command, body: init.body, calls });
  };
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

function videoFile(bytes, type) {
  return new File([bytes], "answer.webm", { type });
}

test("the fixture is a real 30 second WebM recording", () => {
  const path = recordedWebmPath();
  const bytes = readFileSync(path);
  assert.equal(bytes[0], 0x1a);
  assert.equal(bytes[1], 0x45);
  assert.equal(bytes[2], 0xdf);
  assert.equal(bytes[3], 0xa3);
  assert.ok(bytes.length < INLINE_VIDEO_MAX_BYTES);
  const duration = Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
      { encoding: "utf8" },
    ),
  );
  assert.ok(duration > 29 && duration < 31, `duration was ${duration}`);
});

test("inline clips retry a truncated JSON reply, then accept the next one", async () => {
  const bytes = recordedWebmBytes();
  let generates = 0;
  const phases = [];
  const fetchMock = installFetch(async ({ href, body }) => {
    assert.equal(href.includes(":generateContent"), true);
    assert.match(href, new RegExp(GEMINI_MODEL));
    const request = JSON.parse(body);
    const inline = request.contents[0].parts[0].inlineData;
    assert.equal(inline.mimeType, "video/webm");
    assert.ok(inline.data.length > 100);
    assert.equal(request.generationConfig.maxOutputTokens, 16384);
    assert.equal(request.generationConfig.thinkingConfig.thinkingLevel, "LOW");
    assert.equal(request.generationConfig.responseMimeType, "application/json");
    assert.match(request.contents[0].parts[1].text, /bug you fixed/);
    generates += 1;
    if (generates === 1) {
      return jsonResponse(
        200,
        generateBody({
          finishReason: "MAX_TOKENS",
          text: '{"summary":"The close is clear"',
          thoughtText: "I should mention the rush around 0:11",
          thoughtsTokenCount: 4096,
          candidatesTokenCount: 8,
        }),
      );
    }
    return jsonResponse(200, generateBody({ text: validCritiqueText(), thoughtsTokenCount: 40 }));
  });

  try {
    const session = await startCritiqueSession({
      videoFile: videoFile(bytes, "video/webm;codecs=vp9,opus"),
      question: "Tell me about a bug you fixed.",
      onProgress: (phase) => phases.push(phase),
    });
    assert.equal(generates, 2);
    assert.equal(session.critique.categories.length, 4);
    assert.equal(session.critique.categories[0].name, "Cadence (pacing)");
    assert.deepEqual(phases, ["grade", "retry", "grade"]);
    assert.equal(fetchMock.calls.length, 2);
  } finally {
    fetchMock.restore();
  }
});

test("Files API grading waits until the upload is ACTIVE", async () => {
  const bytes = recordedWebmBytes();
  const padded = new Uint8Array(INLINE_VIDEO_MAX_BYTES + 4096);
  padded.set(bytes);
  const file = videoFile(padded, "video/webm;codecs=vp9,opus");
  assert.ok(file.size > INLINE_VIDEO_MAX_BYTES);
  let gets = 0;
  const log = [];
  const fetchMock = installFetch(async ({ href, command, body, calls }) => {
    if (href.includes(":generateContent")) {
      log.push("generate");
      assert.ok(log.includes("active"), "generateContent ran before the file was ACTIVE");
      const request = JSON.parse(body);
      const fileData = request.contents[0].parts[0].fileData;
      assert.equal(fileData.fileUri, FILE_URI);
      assert.equal(fileData.mimeType, "video/webm");
      assert.equal(request.generationConfig.thinkingConfig.thinkingLevel, "LOW");
      return jsonResponse(200, generateBody({ text: validCritiqueText() }));
    }
    if (href.includes("upload/v1beta/files")) {
      log.push("upload-start");
      const start = calls.at(-1);
      assert.equal(start.contentType, "video/webm");
      return jsonResponse(200, {}, { "x-goog-upload-url": UPLOAD_URL });
    }
    if (href.startsWith(UPLOAD_URL)) {
      log.push(command.includes("finalize") ? "upload-final" : "upload-chunk");
      if (!command.includes("finalize")) {
        return jsonResponse(200, {}, { "x-goog-upload-status": "active" });
      }
      return jsonResponse(
        200,
        {
          file: {
            name: FILE_NAME,
            state: "PROCESSING",
            uri: FILE_URI,
            mimeType: "video/webm",
          },
        },
        { "x-goog-upload-status": "final" },
      );
    }
    if (href.includes("/v1beta/files/critiqify-clip")) {
      gets += 1;
      const state = gets === 1 ? "PROCESSING" : "ACTIVE";
      log.push(state.toLowerCase());
      return jsonResponse(200, {
        name: FILE_NAME,
        state,
        uri: FILE_URI,
        mimeType: "video/webm",
      });
    }
    throw new Error(`Unexpected Gemini request ${href}`);
  });

  try {
    const session = await startCritiqueSession({
      videoFile: file,
      question: "Tell me about a bug you fixed.",
      onProgress: () => {},
    });
    assert.equal(session.critique.summary.length > 0, true);
    assert.ok(log.indexOf("generate") > log.indexOf("active"));
    assert.equal(log.filter((entry) => entry === "generate").length, 1);
    assert.ok(log.includes("processing"));
    assert.ok(log.includes("upload-final"));
  } finally {
    fetchMock.restore();
  }
});

test("a safety block is shown once and is not retried", async () => {
  let generates = 0;
  const fetchMock = installFetch(async () => {
    generates += 1;
    return jsonResponse(
      200,
      generateBody({
        finishReason: "SAFETY",
        blockReason: "SAFETY",
        text: "",
        thoughtsTokenCount: 0,
        candidatesTokenCount: 0,
      }),
    );
  });

  try {
    await assert.rejects(
      () =>
        startCritiqueSession({
          videoFile: videoFile(recordedWebmBytes(), "video/webm"),
          question: "Tell me about a bug you fixed.",
        }),
      (error) => {
        assert.equal(error.kind, "model");
        assert.match(error.message, /blocked/i);
        assert.match(error.detail, /SAFETY/);
        assert.equal(error.retryable, false);
        return true;
      },
    );
    assert.equal(generates, 1);
  } finally {
    fetchMock.restore();
  }
});

test("an HTTP 503 from generateContent is retried by the client and then succeeds", async () => {
  let generates = 0;
  const fetchMock = installFetch(async () => {
    generates += 1;
    if (generates === 1) {
      return jsonResponse(503, {
        error: { message: "The service is unavailable.", code: 503, status: "UNAVAILABLE" },
      });
    }
    return jsonResponse(200, generateBody({ text: validCritiqueText() }));
  });

  try {
    const session = await startCritiqueSession({
      videoFile: videoFile(recordedWebmBytes(), "video/webm"),
      question: "",
    });
    assert.equal(session.critique.categories.length, 4);
    assert.equal(generates, 2);
  } finally {
    fetchMock.restore();
  }
});

test("a non-retryable 400 keeps the API message for the error details", async () => {
  let generates = 0;
  const fetchMock = installFetch(async () => {
    generates += 1;
    return jsonResponse(400, {
      error: {
        message: "Request contains an invalid argument.",
        code: 400,
        status: "INVALID_ARGUMENT",
      },
    });
  });

  try {
    await assert.rejects(
      () =>
        startCritiqueSession({
          videoFile: videoFile(recordedWebmBytes(), "video/webm;codecs=vp9,opus"),
          question: "Tell me about a bug you fixed.",
        }),
      (error) => {
        assert.equal(error.retryable, false);
        assert.match(error.detail, /HTTP 400/);
        assert.match(error.detail, /invalid argument/i);
        return true;
      },
    );
    assert.equal(generates, 1);
  } finally {
    fetchMock.restore();
  }
});
