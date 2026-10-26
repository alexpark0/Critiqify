import assert from "node:assert/strict";
import test from "node:test";
import { mockCritique } from "../gemini/critiqueFormat.js";
import {
  demoLogVideos,
  demoScoreRecords,
  formatLogDate,
  mergePracticeLogs,
  practiceStreak,
  readScoreStore,
  scoresFromCritique,
  sparklineGeometry,
  summarizePractice,
  upsertPracticeScore,
} from "./practiceStats.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test("critique scores persist locally and merge onto saved logs by id or url", () => {
  const storage = memoryStorage();
  const scores = scoresFromCritique(mockCritique(""));
  assert.equal(scores.average, 6.5);
  upsertPracticeScore(
    { id: "10-26-2026-09.15.00", scores, practicedAt: "2026-10-26T13:15:00.000Z" },
    storage,
  );
  upsertPracticeScore(
    { id: "10-26-2026-09.15.00", url: "https://cdn.example/takes/a.webm" },
    storage,
  );
  const saved = readScoreStore(storage);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].url, "https://cdn.example/takes/a.webm");
  assert.equal(saved[0].scores.cadence, 7);
  assert.equal(saved[0].scores.eyeContact, 6);

  const rows = mergePracticeLogs(
    [{ date: "10-2-2026-08.00.00", link: "https://cdn.example/takes/b.webm", notes: "Earlier" }],
    [
      ...saved,
      {
        id: "10-2-2026-08.00.00",
        url: "https://cdn.example/takes/different.webm",
        scores: { ...scores, average: 8 },
      },
    ],
  );
  assert.equal(rows[0].scores.average, 8);
  assert.equal(rows.some((row) => row.link === "https://cdn.example/takes/a.webm"), true);

  const byUrl = mergePracticeLogs(
    [{ date: "", link: "https://cdn.example/takes/a.webm", notes: "" }],
    saved,
  );
  assert.equal(byUrl[0].scores.average, 6.5);
  assert.equal(readScoreStore({ getItem: () => "{", setItem() {} }).length, 0);
});

test("practice summary draws a streak and a score trend from saved takes", () => {
  const today = new Date(2026, 9, 26, 15, 0, 0);
  const records = demoScoreRecords(today);
  const summary = summarizePractice({
    videos: demoLogVideos(records),
    records,
    today,
  });
  assert.equal(summary.totalTakes, 5);
  assert.equal(summary.streak, 5);
  assert.equal(summary.state, "trend");
  assert.equal(summary.series.length, 5);
  assert.equal(summary.series[0].average, 5.5);
  assert.equal(summary.series[4].average, 8);
  assert.equal(summary.rows[0].scores.cadence, 5);
  assert.equal(summary.rows[4].scores.intonation, 9);
  assert.equal(new Set(summary.rows.map((row) => row.key)).size, 5);
  assert.ok(Math.abs(summary.recentAverage - 6.65) < 0.001);
  assert.match(summary.chartLabel, /5 scored takes/);
  assert.match(summary.caption, /Score trend/);

  const single = summarizePractice({
    videos: [],
    records: [records[4]],
    today,
  });
  assert.equal(single.state, "single");
  assert.equal(single.streak, 1);
  assert.match(single.caption, /One scored take/);
  assert.equal(single.rows.length, 1);

  const empty = summarizePractice({ videos: [], records: [], today });
  assert.equal(empty.state, "empty");
  assert.equal(empty.streak, 0);
  assert.equal(empty.recentAverage, null);
  assert.match(empty.caption, /start your score trend/);
  assert.match(empty.chartLabel, /preview/i);
});

test("streak counts today or yesterday and stops at a gap", () => {
  const today = new Date(2026, 9, 26, 12, 0, 0);
  const day = (offset) => new Date(2026, 9, 26 + offset, 9, 0, 0);
  assert.equal(practiceStreak([day(0), day(-1), day(-2)], today), 3);
  assert.equal(practiceStreak([day(-1)], today), 1);
  assert.equal(practiceStreak([day(0), day(-2)], today), 1);
  assert.equal(practiceStreak([day(-3)], today), 0);
  assert.equal(practiceStreak([], today), 0);
});

test("sparkline puts a higher score above a lower score", () => {
  const high = sparklineGeometry([10], 100, 40, 4);
  const low = sparklineGeometry([0], 100, 40, 4);
  assert.ok(high.points[0].y < low.points[0].y);
  assert.equal(high.points[0].x, 50);

  const line = sparklineGeometry([2, 8], 100, 40, 4);
  assert.equal(line.points[0].x, 4);
  assert.equal(line.points[1].x, 96);
  assert.match(line.line, /^M/);
  assert.match(formatLogDate("not-a-stamp"), /not-a-stamp/);
  assert.match(formatLogDate("10-26-2026-09.15.00"), /2026/);
});
