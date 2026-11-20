import { removePracticeScores, updatePracticeNotes } from "../practice/practiceStats.js";

export const VIDEOS_TABLE = "videos";
export const VIDEOS_BUCKET = "videos";

export const LOG_COPY = {
  notesFailed: "Couldn't save these notes. The storage service may be unavailable.",
  notesUnreachable: "Couldn't reach the storage service. Check your connection and try again.",
  notesSaved: "Notes saved.",
  deleteFailed: "Couldn't delete this log. The storage service may be unavailable.",
  deleteUnreachable: "Couldn't reach the storage service. Check your connection and try again.",
  fileFailed: "The log was deleted, but the recording file could not be removed.",
  deleteStoredPrompt: "Delete this log and its recording? This can't be undone.",
  deleteLocalPrompt: "Delete the scores saved on this device for this take? This can't be undone.",
  deleteDemoPrompt: "Remove this sample log from the demo? Your saved recordings stay as they are.",
  deleted: "Log deleted.",
  deletedLocal: "Scores for that take were deleted from this device.",
  deletedDemo: "Sample log removed.",
};

export function normalizeNotes(notes) {
  return typeof notes === "string" ? notes.trim() : "";
}

export function recordingObjectPath(date) {
  if (typeof date !== "string" || date.length === 0) return null;
  return `${date}.webm`;
}

export function isStoredLog(log) {
  if (!log || log.localOnly) return false;
  return log.id !== null && log.id !== undefined && log.id !== "";
}

export function sameDatabaseId(left, right) {
  if (left == null || right == null || left === "" || right === "") return false;
  return String(left) === String(right);
}

export function logActionKey(log) {
  if (isStoredLog(log)) return `id:${log.id}`;
  if (log?.date) return `date:${log.date}`;
  if (log?.link) return `link:${log.link}`;
  return `row:${log?.key || "unknown"}`;
}

export function deletePrompt(log, { demo = false } = {}) {
  if (demo) return LOG_COPY.deleteDemoPrompt;
  if (isStoredLog(log)) return LOG_COPY.deleteStoredPrompt;
  return LOG_COPY.deleteLocalPrompt;
}

function sameDemoVideo(video, log) {
  if (log?.date && video?.date) return video.date === log.date;
  if (!log?.date && log?.link && video?.link) return video.link === log.link;
  return false;
}

function sameDemoRecord(record, log) {
  if (log?.date && record?.id) return record.id === log.date;
  if (!log?.date && log?.link && record?.url) return record.url === log.link;
  return false;
}

export function replaceDemoVideoNotes(videos, log, notes) {
  const text = normalizeNotes(notes);
  return (Array.isArray(videos) ? videos : []).map((video) =>
    sameDemoVideo(video, log) ? { ...video, notes: text } : video,
  );
}

export function replaceDemoRecordNotes(records, log, notes) {
  const text = normalizeNotes(notes);
  return (Array.isArray(records) ? records : []).map((record) =>
    sameDemoRecord(record, log) ? { ...record, notes: text } : record,
  );
}

export function removeDemoVideo(videos, log) {
  return (Array.isArray(videos) ? videos : []).filter((video) => !sameDemoVideo(video, log));
}

export function removeDemoRecord(records, log) {
  return (Array.isArray(records) ? records : []).filter((record) => !sameDemoRecord(record, log));
}

function changedRows(result) {
  return Boolean(result) && !result.error && Array.isArray(result.data) && result.data.length > 0;
}

function isMissingStorageObject(error) {
  if (!error) return false;
  const status = Number(error.statusCode ?? error.status);
  if (status === 404) return true;
  const code = `${error.error || error.code || ""}`.toLowerCase();
  if (code.includes("not_found") || code.includes("not found")) return true;
  const message = `${error.message || ""}`.toLowerCase();
  return message.includes("not found") || message.includes("does not exist");
}

function storageRemoveFailed(result) {
  if (result?.error && !isMissingStorageObject(result.error)) return true;
  if (!Array.isArray(result?.data)) return false;
  return result.data.some((item) => {
    const error = item?.error;
    if (!error) return false;
    const shaped = typeof error === "string" ? { message: error } : error;
    return !isMissingStorageObject(shaped);
  });
}

function scoreTarget(log, notes) {
  const target = { id: log?.date || "", url: log?.link || "" };
  if (notes !== undefined) target.notes = notes;
  return target;
}

export async function saveLogNotes({ demo = false, client, log, notes, storage } = {}) {
  const text = normalizeNotes(notes);
  if (demo) return { ok: true, demo: true, notes: text };

  if (!isStoredLog(log)) {
    updatePracticeNotes(scoreTarget(log, text), storage);
    return { ok: true, local: true, notes: text };
  }

  try {
    const updated = await client.from(VIDEOS_TABLE).update({ notes: text }).eq("id", log.id).select();
    if (!changedRows(updated)) return { ok: false, message: LOG_COPY.notesFailed };
    updatePracticeNotes(scoreTarget(log, text), storage);
    return { ok: true, notes: text };
  } catch {
    return { ok: false, message: LOG_COPY.notesUnreachable };
  }
}

export async function deleteSavedLog({ demo = false, client, log, storage } = {}) {
  if (demo) return { ok: true, demo: true };

  const target = scoreTarget(log);
  if (!isStoredLog(log)) {
    removePracticeScores(target, storage);
    return { ok: true, local: true };
  }

  const path = recordingObjectPath(log?.date);
  let rowDeleted = false;
  try {
    const deleted = await client.from(VIDEOS_TABLE).delete().eq("id", log.id).select();
    if (!changedRows(deleted)) {
      return { ok: false, rowDeleted: false, message: LOG_COPY.deleteFailed };
    }
    rowDeleted = true;
    removePracticeScores(target, storage);
    if (path) {
      const removed = await client.storage.from(VIDEOS_BUCKET).remove([path]);
      if (storageRemoveFailed(removed)) {
        return { ok: false, rowDeleted: true, message: LOG_COPY.fileFailed };
      }
    }
    return { ok: true, rowDeleted: true };
  } catch {
    return {
      ok: false,
      rowDeleted,
      message: rowDeleted ? LOG_COPY.fileFailed : LOG_COPY.deleteUnreachable,
    };
  }
}
