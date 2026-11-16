import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { demoLogVideos, demoScoreRecords, SCORE_STORAGE_KEY } from "../practice/practiceStats.js";
import {
  LOG_COPY,
  deletePrompt,
  deleteSavedLog,
  logActionKey,
  recordingObjectPath,
  removeDemoRecord,
  removeDemoVideo,
  replaceDemoRecordNotes,
  replaceDemoVideoNotes,
  sameDatabaseId,
  saveLogNotes,
} from "./logActions.js";

function memoryStorage(records) {
  const data = new Map();
  if (records) data.set(SCORE_STORAGE_KEY, JSON.stringify(records));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    read() {
      return JSON.parse(data.get(SCORE_STORAGE_KEY) || "[]");
    },
  };
}

function throwingClient() {
  return new Proxy(
    {},
    {
      get() {
        throw new Error("network");
      },
    },
  );
}

function filterBuilder(call, result) {
  const builder = {
    eq(column, value) {
      call.column = column;
      call.value = value;
      return builder;
    },
    select(columns) {
      call.selected = columns === undefined ? "*" : columns;
      return builder;
    },
    then(resolve, reject) {
      try {
        const payload = typeof result === "function" ? result(call) : result;
        return Promise.resolve(payload).then(resolve, reject);
      } catch (error) {
        return Promise.reject(error).then(resolve, reject);
      }
    },
  };
  return builder;
}

function scriptedClient({
  update = { data: [{ id: 1 }], error: null },
  delete: removeRow = { data: [{ id: 1 }], error: null },
  remove = { data: [{ name: "file.webm" }], error: null },
} = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        update(payload) {
          const call = { op: "update", table, payload, selected: false };
          calls.push(call);
          return filterBuilder(call, update);
        },
        delete() {
          const call = { op: "delete", table, selected: false };
          calls.push(call);
          return filterBuilder(call, removeRow);
        },
      };
    },
    storage: {
      from(bucket) {
        return {
          remove(paths) {
            calls.push({ op: "remove", bucket, paths });
            if (typeof remove === "function") {
              try {
                return Promise.resolve(remove(paths));
              } catch (error) {
                return Promise.reject(error);
              }
            }
            return Promise.resolve(remove);
          },
        };
      },
    },
  };
}

const storedLog = {
  id: 15,
  date: "10-26-2026-09.15.00",
  link: "https://dciyttpbryiswtotblbz.supabase.co/storage/v1/object/public/videos/10-26-2026-09.15.00.webm",
  notes: "Opening rushed",
  localOnly: false,
};

test("logs and the recorder point at the current Supabase project", () => {
  const url = "https://dciyttpbryiswtotblbz.supabase.co";
  const key = "sb_publishable_mWYgc6UT2RSMdpQc8L193A_svC6fGND";
  for (const relative of ["../VideoRecorder.jsx", "../pages/Videos.jsx"]) {
    const source = readFileSync(new URL(relative, import.meta.url), "utf8");
    assert.equal(source.includes(url), true);
    assert.equal(source.includes(key), true);
    assert.equal(source.includes("hngxaylgylmtakwbxzss"), false);
  }
});

test("recording files use the same date.webm path as upload", () => {
  assert.equal(recordingObjectPath("10-26-2026-09.15.00"), "10-26-2026-09.15.00.webm");
  assert.equal(recordingObjectPath(""), null);
  assert.equal(recordingObjectPath(null), null);
  assert.equal(sameDatabaseId(15, "15"), true);
  assert.equal(sameDatabaseId(null, 15), false);
  assert.equal(sameDatabaseId("", 15), false);
  assert.equal(logActionKey(storedLog), "id:15");
  assert.equal(logActionKey({ localOnly: true, date: storedLog.date }), `date:${storedLog.date}`);
});

test("delete asks before removing a saved log, a device-only take, or a demo sample", () => {
  assert.equal(deletePrompt(storedLog), LOG_COPY.deleteStoredPrompt);
  assert.match(LOG_COPY.deleteStoredPrompt, /can't be undone/);
  assert.equal(deletePrompt({ localOnly: true, date: storedLog.date }), LOG_COPY.deleteLocalPrompt);
  assert.equal(deletePrompt(storedLog, { demo: true }), LOG_COPY.deleteDemoPrompt);
  assert.equal(LOG_COPY.deleteDemoPrompt.includes("storage service"), false);
});

test("saving notes updates the videos row and the local score for that take", async () => {
  const storage = memoryStorage([
    { id: storedLog.date, url: storedLog.link, notes: "Opening rushed", scores: { average: 6 } },
    { id: "11-2-2026-08.00.00", url: "https://cdn.example/other.webm", notes: "Keep" },
  ]);
  const client = scriptedClient();
  const result = await saveLogNotes({
    client,
    log: storedLog,
    notes: "  Hold the close.  ",
    storage,
  });

  assert.equal(result.ok, true);
  assert.equal(result.notes, "Hold the close.");
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].op, "update");
  assert.equal(client.calls[0].table, "videos");
  assert.deepEqual(client.calls[0].payload, { notes: "Hold the close." });
  assert.equal(client.calls[0].column, "id");
  assert.equal(client.calls[0].value, 15);
  assert.equal(client.calls[0].selected, "*");
  const saved = storage.read();
  assert.equal(saved[0].notes, "Hold the close.");
  assert.equal(saved[1].notes, "Keep");
  assert.equal(saved[0].scores.average, 6);
});

test("a failed note save leaves the local score untouched", async () => {
  const storage = memoryStorage([{ id: storedLog.date, url: storedLog.link, notes: "Opening rushed" }]);
  const denied = await saveLogNotes({
    client: scriptedClient({ update: { data: [], error: { message: "row-level security" } } }),
    log: storedLog,
    notes: "Changed",
    storage,
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.message, LOG_COPY.notesFailed);
  assert.equal(storage.read()[0].notes, "Opening rushed");

  const offline = await saveLogNotes({
    client: scriptedClient({
      update() {
        throw new Error("offline");
      },
    }),
    log: storedLog,
    notes: "Changed",
    storage,
  });
  assert.equal(offline.ok, false);
  assert.equal(offline.message, LOG_COPY.notesUnreachable);
  assert.equal(storage.read()[0].notes, "Opening rushed");
});

test("device-only notes are saved locally and do not call Supabase", async () => {
  const storage = memoryStorage([{ id: storedLog.date, notes: "Old" }]);
  const result = await saveLogNotes({
    client: throwingClient(),
    log: { localOnly: true, id: 15, date: storedLog.date, link: "", notes: "Old" },
    notes: "   ",
    storage,
  });
  assert.equal(result.ok, true);
  assert.equal(result.local, true);
  assert.equal(result.notes, "");
  assert.equal(storage.read()[0].notes, "");
});

test("deleting a saved log removes the row, the date.webm file, and local scores", async () => {
  const storage = memoryStorage([
    { id: storedLog.date, url: "https://cdn.example/different.webm", notes: "By id" },
    { id: "other-stamp", url: storedLog.link, notes: "By url" },
    { id: "11-2-2026-08.00.00", url: "https://cdn.example/keep.webm", notes: "Keep" },
  ]);
  const client = scriptedClient();
  const result = await deleteSavedLog({ client, log: storedLog, storage });

  assert.equal(result.ok, true);
  assert.equal(result.rowDeleted, true);
  assert.deepEqual(
    client.calls.map((call) => call.op),
    ["delete", "remove"],
  );
  assert.equal(client.calls[0].table, "videos");
  assert.equal(client.calls[0].column, "id");
  assert.equal(client.calls[0].value, 15);
  assert.equal(client.calls[0].selected, "*");
  assert.equal(client.calls[1].bucket, "videos");
  assert.deepEqual(client.calls[1].paths, ["10-26-2026-09.15.00.webm"]);
  assert.deepEqual(
    storage.read().map((record) => record.notes),
    ["Keep"],
  );
});

test("a rejected row delete keeps the file and the local scores", async () => {
  const storage = memoryStorage([{ id: storedLog.date, url: storedLog.link, notes: "Stay" }]);
  const client = scriptedClient({
    delete: { data: null, error: { message: "permission denied" } },
  });
  const result = await deleteSavedLog({ client, log: storedLog, storage });

  assert.equal(result.ok, false);
  assert.equal(result.rowDeleted, false);
  assert.equal(result.message, LOG_COPY.deleteFailed);
  assert.deepEqual(
    client.calls.map((call) => call.op),
    ["delete"],
  );
  assert.equal(storage.read()[0].notes, "Stay");
});

test("a missing recording file still finishes the delete", async () => {
  const storage = memoryStorage([{ id: storedLog.date, notes: "Gone" }]);
  const result = await deleteSavedLog({
    client: scriptedClient({
      remove: { data: null, error: { message: "Object not found", statusCode: 404 } },
    }),
    log: storedLog,
    storage,
  });
  assert.equal(result.ok, true);
  assert.equal(storage.read().length, 0);
});

test("a storage failure after the row is gone reports that the file may remain", async () => {
  const storage = memoryStorage([{ id: storedLog.date, notes: "Gone" }]);
  const denied = await deleteSavedLog({
    client: scriptedClient({
      remove: { data: null, error: { message: "Unauthorized", statusCode: 403 } },
    }),
    log: storedLog,
    storage,
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.rowDeleted, true);
  assert.equal(denied.message, LOG_COPY.fileFailed);
  assert.equal(storage.read().length, 0);

  const storageAfter = memoryStorage([{ id: storedLog.date, notes: "Gone" }]);
  const dropped = await deleteSavedLog({
    client: scriptedClient({
      remove() {
        throw new Error("offline");
      },
    }),
    log: storedLog,
    storage: storageAfter,
  });
  assert.equal(dropped.message, LOG_COPY.fileFailed);
  assert.equal(dropped.rowDeleted, true);
  assert.equal(storageAfter.read().length, 0);
});

test("a log with no recording stamp deletes the row without calling storage", async () => {
  const client = scriptedClient();
  const result = await deleteSavedLog({
    client,
    log: { id: 4, date: "", link: "", notes: "", localOnly: false },
    storage: memoryStorage(),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(
    client.calls.map((call) => call.op),
    ["delete"],
  );
});

test("device-only deletes clear local scores and do not call Supabase", async () => {
  const storage = memoryStorage([
    { id: storedLog.date, notes: "Local" },
    { id: "11-2-2026-08.00.00", notes: "Keep" },
  ]);
  const result = await deleteSavedLog({
    client: throwingClient(),
    log: { localOnly: true, date: storedLog.date, link: "", notes: "Local" },
    storage,
  });
  assert.equal(result.ok, true);
  assert.equal(result.local, true);
  assert.deepEqual(
    storage.read().map((record) => record.id),
    ["11-2-2026-08.00.00"],
  );
});

test("demo edits and deletes stay in memory and never touch the network or local scores", async () => {
  const records = demoScoreRecords(new Date(2026, 9, 26, 12, 0, 0));
  const videos = demoLogVideos(records);
  const target = { date: records[1].id, link: records[1].url, notes: records[1].notes };
  const storage = memoryStorage([{ id: records[1].id, url: records[1].url, notes: "Real take" }]);
  const client = throwingClient();

  const saved = await saveLogNotes({ demo: true, client, log: target, notes: "  Quieter close  ", storage });
  assert.equal(saved.demo, true);
  assert.equal(saved.notes, "Quieter close");
  assert.equal(storage.read()[0].notes, "Real take");

  const editedVideos = replaceDemoVideoNotes(videos, target, saved.notes);
  const editedRecords = replaceDemoRecordNotes(records, target, saved.notes);
  assert.equal(editedVideos[1].notes, "Quieter close");
  assert.equal(editedRecords[1].notes, "Quieter close");
  assert.equal(editedVideos[0].notes, videos[0].notes);
  assert.equal(editedVideos.length, 5);

  const removed = await deleteSavedLog({ demo: true, client, log: { ...target, id: 99 }, storage });
  assert.equal(removed.demo, true);
  assert.equal(storage.read()[0].notes, "Real take");
  const remainingVideos = removeDemoVideo(editedVideos, target);
  const remainingRecords = removeDemoRecord(editedRecords, target);
  assert.equal(remainingVideos.length, 4);
  assert.equal(remainingRecords.length, 4);
  assert.equal(
    remainingVideos.some((video) => video.date === records[1].id),
    false,
  );
  assert.equal(
    remainingRecords.some((record) => record.id === records[0].id),
    true,
  );
  assert.equal(
    remainingRecords.some((record) => record.id === records[4].id),
    true,
  );
});
