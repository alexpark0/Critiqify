import assert from "node:assert/strict";
import test from "node:test";
import { CritiqueError } from "./critiqueFormat.js";
import { pollFileUntilActive } from "./critiqueClient.js";

function clockedSleep(clock) {
  return async (ms) => {
    clock.value += ms;
  };
}

test("pollFileUntilActive waits through PROCESSING and does not stop on a missing state", async () => {
  const seen = [];
  const phases = [];
  let reads = 0;
  const ready = await pollFileUntilActive({
    file: { name: "files/clip", state: "PROCESSING" },
    onProgress: (phase) => phases.push(phase),
    now: () => 0,
    sleep: async () => {},
    timeoutMs: 60_000,
    getFile: async (name) => {
      reads += 1;
      seen.push(name);
      if (reads === 1) return { name, uri: "https://example/files/clip" };
      if (reads === 2) return { name, state: "PROCESSING", uri: "https://example/files/clip" };
      return { name, state: "ACTIVE", uri: "https://example/files/clip", mimeType: "video/webm" };
    },
  });

  assert.equal(reads, 3);
  assert.deepEqual(seen, ["files/clip", "files/clip", "files/clip"]);
  assert.equal(ready.state, "ACTIVE");
  assert.deepEqual(phases, ["process", "process"]);
});

test("pollFileUntilActive unwraps a nested file and returns once it is ACTIVE", async () => {
  const ready = await pollFileUntilActive({
    file: { file: { name: "files/nested", state: "PROCESSING" } },
    now: () => 0,
    sleep: async () => {},
    timeoutMs: 60_000,
    getFile: async (name) => ({
      file: { name, state: "ACTIVE", uri: "https://example/files/nested" },
    }),
  });
  assert.equal(ready.uri, "https://example/files/nested");
});

test("pollFileUntilActive reports FAILED immediately", async () => {
  await assert.rejects(
    () =>
      pollFileUntilActive({
        file: { name: "files/bad", state: "PROCESSING" },
        now: () => 0,
        sleep: async () => {},
        timeoutMs: 60_000,
        getFile: async (name) => ({ name, state: "FAILED", error: { message: "bad video" } }),
      }),
    (error) => {
      assert.equal(error instanceof CritiqueError, true);
      assert.equal(error.kind, "upload");
      assert.match(error.message, /couldn't process/i);
      return true;
    },
  );
});

test("pollFileUntilActive keeps polling after a retryable 503 until the deadline", async () => {
  const clock = { value: 0 };
  let reads = 0;
  await assert.rejects(
    () =>
      pollFileUntilActive({
        file: { name: "files/busy" },
        now: () => clock.value,
        sleep: clockedSleep(clock),
        timeoutMs: 2500,
        getFile: async () => {
          reads += 1;
          const error = new Error("unavailable");
          error.status = 503;
          throw error;
        },
      }),
    (error) => {
      assert.equal(error instanceof CritiqueError, true);
      assert.equal(error.kind, "processing");
      assert.match(error.message, /few minutes/);
      return true;
    },
  );
  assert.ok(reads > 1);
});

test("pollFileUntilActive does not retry an authentication failure", async () => {
  let reads = 0;
  await assert.rejects(
    () =>
      pollFileUntilActive({
        file: { name: "files/locked" },
        now: () => 0,
        sleep: async () => {},
        timeoutMs: 60_000,
        getFile: async () => {
          reads += 1;
          const error = new Error("API key not valid. Please pass a valid API key.");
          error.status = 400;
          throw error;
        },
      }),
    (error) => {
      assert.equal(error.kind, "auth");
      return true;
    },
  );
  assert.equal(reads, 1);
});
