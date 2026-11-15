import { DEMO_VIDEO_SRC } from "../demo/demoMode.js";

export const SCORE_STORAGE_KEY = "critiqify.practiceScores.v1";

const CATEGORY_FIELDS = [
  ["Cadence (pacing)", "cadence"],
  ["Eye contact", "eyeContact"],
  ["Filler words", "fillerWords"],
  ["Intonation", "intonation"],
];

const DEMO_PRESETS = [
  { scores: [5, 5, 6, 6], notes: "Opening was steady, then the example rushed." },
  { scores: [6, 5, 6, 7], notes: "Fewer fillers, eyes still dropped in the middle." },
  { scores: [7, 6, 6, 7], notes: "Clearer ending. Hold the camera a beat longer." },
  { scores: [8, 7, 6, 8], notes: "Pace landed. One leftover filler on the result." },
  { scores: [8, 8, 7, 9], notes: "Best take this week. Keep the close that quiet." },
];

export const TREND_PREVIEW = [3.2, 4.1, 3.6, 5.2, 6.4, 5.8, 7.1];

export function parseStampDate(value) {
  const match = /^(\d+)-(\d+)-(\d+)-(\d+)\.(\d+)\.(\d+)$/.exec(value ?? "");
  if (!match) return null;
  const [, month, day, year, hours, minutes, seconds] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds),
  );
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatLogDate(value) {
  const date = parseStampDate(value);
  if (!date) return value || "Unknown date";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function stampFromDate(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${month}-${day}-${year}-${hours}.${minutes}.${seconds}`;
}

export function scoresFromCritique(critique) {
  const categories = Array.isArray(critique?.categories) ? critique.categories : [];
  const scores = {
    cadence: null,
    eyeContact: null,
    fillerWords: null,
    intonation: null,
    average: null,
  };
  for (const [name, field] of CATEGORY_FIELDS) {
    const match = categories.find((category) => category?.name === name);
    const value = Number(match?.score);
    scores[field] = Number.isFinite(value) ? value : null;
  }
  const values = CATEGORY_FIELDS.map(([, field]) => scores[field]).filter((value) =>
    Number.isFinite(value),
  );
  scores.average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  return scores;
}

function isScoreRecord(value) {
  if (!value || typeof value !== "object") return false;
  return typeof value.id === "string" || typeof value.url === "string";
}

export function readScoreStore(storage = globalThis.localStorage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SCORE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isScoreRecord) : [];
  } catch {
    return [];
  }
}

function sameTake(left, right) {
  if (left?.id && right?.id) return left.id === right.id;
  if (left?.url && right?.url) return left.url === right.url;
  return false;
}

function definedFields(partial) {
  const next = {};
  for (const [key, value] of Object.entries(partial || {})) {
    if (value !== undefined) next[key] = value;
  }
  return next;
}

export function upsertPracticeScore(partial, storage = globalThis.localStorage) {
  const current = readScoreStore(storage);
  const incoming = definedFields(partial);
  const index = current.findIndex((record) => sameTake(record, incoming));
  const previous = index >= 0 ? current[index] : {};
  const nextRecord = {
    ...previous,
    ...incoming,
    id: incoming.id || previous.id || "",
    practicedAt: previous.practicedAt || incoming.practicedAt || new Date().toISOString(),
    scores: incoming.scores || previous.scores || null,
  };
  const next = index >= 0
    ? current.map((record, recordIndex) => (recordIndex === index ? nextRecord : record))
    : [...current, nextRecord];
  try {
    storage?.setItem(SCORE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode and full storage should not block the critique.
  }
  return nextRecord;
}

function recordTime(record) {
  const parsed = Date.parse(record?.practicedAt || "");
  if (Number.isFinite(parsed)) return parsed;
  const stamped = parseStampDate(record?.id);
  return stamped ? stamped.getTime() : 0;
}

export function trendSeries(records) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => Number.isFinite(record?.scores?.average))
    .map((record) => ({
      id: record.id || record.url || "",
      at: recordTime(record),
      average: record.scores.average,
      scores: record.scores,
    }))
    .sort((left, right) => left.at - right.at || left.id.localeCompare(right.id));
}

export function mergePracticeLogs(videos, records) {
  const list = Array.isArray(videos) ? videos : [];
  const saved = Array.isArray(records) ? records : [];
  const unused = new Set(saved.map((_, index) => index));
  const matches = list.map((video) => {
    if (!video?.date) return -1;
    return saved.findIndex((record, index) => unused.has(index) && record?.id === video.date);
  });
  matches.forEach((matchIndex, index) => {
    if (matchIndex >= 0) {
      unused.delete(matchIndex);
      return;
    }
    const video = list[index];
    if (!video?.link) return;
    const byUrl = saved.findIndex(
      (record, recordIndex) => unused.has(recordIndex) && record?.url && record.url === video.link,
    );
    if (byUrl >= 0) {
      matches[index] = byUrl;
      unused.delete(byUrl);
    }
  });
  const rows = list.map((video, index) => {
    const matchIndex = matches[index];
    return {
      key: `${video?.date || video?.link || "row"}-${index}`,
      date: video?.date || "",
      link: video?.link || "",
      notes: video?.notes || "",
      scores: matchIndex >= 0 ? saved[matchIndex].scores || null : null,
      localOnly: false,
    };
  });

  for (const index of unused) {
    const record = saved[index];
    if (!record?.id && !record?.url) continue;
    rows.push({
      key: record.id || record.url || `local-${index}`,
      date: record.id || "",
      link: record.url || "",
      notes: record.notes || "",
      scores: record.scores || null,
      localOnly: true,
    });
  }

  return rows;
}

function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function practiceDays(videos, records) {
  const days = [];
  for (const video of Array.isArray(videos) ? videos : []) {
    const stamped = parseStampDate(video?.date);
    if (stamped) days.push(stamped);
  }
  for (const record of Array.isArray(records) ? records : []) {
    const parsed = Date.parse(record?.practicedAt || "");
    if (Number.isFinite(parsed)) {
      days.push(new Date(parsed));
      continue;
    }
    const stamped = parseStampDate(record?.id);
    if (stamped) days.push(stamped);
  }
  return days;
}

export function practiceStreak(dates, today = new Date()) {
  const keys = new Set();
  for (const value of dates) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    keys.add(dayKey(date));
  }
  if (keys.size === 0) return 0;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterday = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
  let cursor = null;
  if (keys.has(dayKey(start))) cursor = start;
  else if (keys.has(dayKey(yesterday))) cursor = yesterday;
  if (!cursor) return 0;
  let streak = 0;
  while (keys.has(dayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  return streak;
}

export function sparklineGeometry(values, width = 220, height = 48, pad = 4) {
  const list = Array.isArray(values) ? values : [];
  if (!list.length) return { points: [], line: "", area: "", width, height };
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const step = list.length === 1 ? 0 : innerW / (list.length - 1);
  const points = list.map((value, index) => {
    const numeric = Number(value);
    const clamped = Number.isFinite(numeric) ? Math.max(0, Math.min(10, numeric)) : 0;
    const x = list.length === 1 ? width / 2 : pad + step * index;
    const y = pad + (1 - clamped / 10) * innerH;
    return { x, y, value: clamped };
  });
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const baseline = (height - pad).toFixed(2);
  const area = `${line} L${points[points.length - 1].x.toFixed(2)} ${baseline} L${points[0].x.toFixed(2)} ${baseline} Z`;
  return { points, line, area, width, height };
}

function trendCopy(state, series) {
  if (state === "single") {
    const score = series[0].average.toFixed(1);
    return {
      caption: `One scored take so far, a ${score}. Record another to draw the trend.`,
      chartLabel: `One scored take at ${score} out of 10.`,
    };
  }
  if (state === "trend") {
    const first = series[0].average.toFixed(1);
    const last = series[series.length - 1].average.toFixed(1);
    return {
      caption: "Score trend across your saved takes.",
      chartLabel: `Score trend from ${first} to ${last} across ${series.length} scored takes.`,
    };
  }
  return {
    caption: "Critique a take to start your score trend.",
    chartLabel: "Score trend preview. No scored takes yet.",
  };
}

export function summarizePractice({ videos = [], records = [], today = new Date() } = {}) {
  const rows = mergePracticeLogs(videos, records);
  const series = trendSeries(records);
  const state = series.length >= 2 ? "trend" : series.length === 1 ? "single" : "empty";
  const recent = series.slice(-5);
  const recentAverage = recent.length
    ? recent.reduce((sum, point) => sum + point.average, 0) / recent.length
    : null;
  const copy = trendCopy(state, series);
  return {
    totalTakes: rows.length,
    streak: practiceStreak(practiceDays(videos, records), today),
    recentAverage,
    series,
    state,
    rows,
    caption: copy.caption,
    chartLabel: copy.chartLabel,
  };
}

export function demoScoreRecords(now = new Date()) {
  return DEMO_PRESETS.map((preset, index) => {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 15, 0, 0);
    at.setDate(at.getDate() - (DEMO_PRESETS.length - 1 - index));
    const [cadence, eyeContact, fillerWords, intonation] = preset.scores;
    const average = preset.scores.reduce((sum, value) => sum + value, 0) / preset.scores.length;
    return {
      id: stampFromDate(at),
      url: DEMO_VIDEO_SRC,
      practicedAt: at.toISOString(),
      notes: preset.notes,
      scores: { cadence, eyeContact, fillerWords, intonation, average },
    };
  });
}

export function demoLogVideos(records = demoScoreRecords()) {
  return records.map((record) => ({
    date: record.id,
    link: DEMO_VIDEO_SRC,
    notes: record.notes || "",
  }));
}
