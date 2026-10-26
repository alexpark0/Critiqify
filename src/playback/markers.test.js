import assert from "node:assert/strict";
import test from "node:test";
import { mockCritique } from "../gemini/critiqueFormat.js";
import {
  FLAG_COLOR,
  STRONG_COLOR,
  extractTimelineMarkers,
  filterTimelineMarkers,
  layoutTimelineMarkers,
  markerOffsetPercent,
  scoreMeterModel,
  toggleCategoryFilter,
} from "./markers.js";

test("extractTimelineMarkers plots category timestamps and colors them by score", () => {
  const markers = extractTimelineMarkers(mockCritique("Tell me about a bug."));
  assert.deepEqual(
    markers.map((marker) => [marker.timestamp, marker.label, marker.tone, marker.color || ""]),
    [
      ["0:08", "Filler words", "flag", ""],
      ["0:11", "Cadence", "strong", ""],
      ["0:16", "Intonation", "strong", ""],
      ["0:19", "Cadence", "strong", ""],
      ["0:22", "Eye contact", "flag", ""],
      ["0:24", "Filler words", "flag", ""],
      ["0:29", "Filler words", "flag", ""],
      ["0:31", "Intonation", "strong", ""],
      ["0:34", "Cadence", "strong", ""],
    ],
  );
  assert.equal(markers.find((marker) => marker.label === "Cadence").tone, "strong");
  assert.equal(markers.find((marker) => marker.label === "Eye contact").tone, "flag");
});

test("filterTimelineMarkers keeps one category and can return to all", () => {
  const markers = extractTimelineMarkers(mockCritique(""));
  const eyes = filterTimelineMarkers(markers, "Eye contact");
  assert.deepEqual(eyes.map((marker) => marker.timestamp), ["0:22"]);
  const cadence = filterTimelineMarkers(markers, "Cadence (pacing)");
  assert.equal(cadence.length, 3);
  assert.equal(filterTimelineMarkers(markers, "all").length, markers.length);

  assert.equal(toggleCategoryFilter("all", "Eye contact"), "Eye contact");
  assert.equal(toggleCategoryFilter("Eye contact", "Eye contact"), "all");
  assert.equal(toggleCategoryFilter("Eye contact", "all"), "all");
});

test("layoutTimelineMarkers places dots on the scrubber and highlights the active category", () => {
  const markers = extractTimelineMarkers({
    categories: [
      {
        name: "Cadence (pacing)",
        score: 8,
        explanation: "Steady at 0:06 and again at 1:05.",
        tips: ["Pause at 0:06 before the result."],
      },
      {
        name: "Filler words",
        score: 4,
        explanation: "An uh at 0:06.",
        tips: [],
      },
    ],
  });
  assert.equal(markers.filter((marker) => marker.seconds === 6).length, 2);

  const laid = layoutTimelineMarkers(markers, 70, "Cadence (pacing)");
  const atSix = laid.filter((marker) => marker.seconds === 6);
  assert.equal(atSix.length, 2);
  assert.equal(atSix.find((marker) => marker.label === "Cadence").dimmed, false);
  assert.equal(atSix.find((marker) => marker.label === "Filler words").dimmed, true);
  assert.equal(atSix.find((marker) => marker.label === "Cadence").color, STRONG_COLOR);
  assert.equal(atSix.find((marker) => marker.label === "Filler words").color, FLAG_COLOR);
  assert.notEqual(atSix[0].nudge, atSix[1].nudge);

  const minute = laid.find((marker) => marker.timestamp === "1:05");
  assert.equal(minute.percent, markerOffsetPercent(65, 70));
  assert.equal(layoutTimelineMarkers(markers, 10, "all").some((marker) => marker.seconds === 65), false);
});

test("score meters use forest green from 7 up and amber below", () => {
  const strong = scoreMeterModel(7);
  const flagged = scoreMeterModel(6);
  assert.equal(strong.tone, "strong");
  assert.equal(strong.color, STRONG_COLOR);
  assert.equal(strong.width, "70%");
  assert.equal(flagged.tone, "flag");
  assert.equal(flagged.color, FLAG_COLOR);
  assert.equal(flagged.width, "60%");
  assert.equal(scoreMeterModel(10).width, "100%");
  assert.equal(scoreMeterModel(0).width, "0%");
});
