import { splitTimestamps } from "./time.js";

export const STRONG_COLOR = "#718A9E";
export const FLAG_COLOR = "#E4A499";

const CATEGORY_LABELS = {
  "Cadence (pacing)": "Cadence",
  "Eye contact": "Eye contact",
  "Filler words": "Filler words",
  Intonation: "Intonation",
};

export const CATEGORY_FILTERS = [
  { id: "all", label: "All" },
  { id: "Cadence (pacing)", label: "Cadence" },
  { id: "Eye contact", label: "Eye contact" },
  { id: "Filler words", label: "Filler words" },
  { id: "Intonation", label: "Intonation" },
];

export function categoryLabel(name) {
  return CATEGORY_LABELS[name] || name || "Note";
}

export function scoreTone(score) {
  return Number(score) >= 7 ? "strong" : "flag";
}

export function markerColor(tone) {
  return tone === "strong" ? STRONG_COLOR : FLAG_COLOR;
}

export function scoreMeterModel(score) {
  const numeric = Number(score);
  const value = Number.isFinite(numeric) ? Math.min(10, Math.max(0, numeric)) : 0;
  const tone = scoreTone(value);
  return {
    value,
    percent: (value / 10) * 100,
    width: `${(value / 10) * 100}%`,
    tone,
    color: markerColor(tone),
  };
}

function categoryTexts(category) {
  const texts = [];
  if (typeof category?.explanation === "string") texts.push(category.explanation);
  if (Array.isArray(category?.tips)) {
    for (const tip of category.tips) {
      if (typeof tip === "string") texts.push(tip);
    }
  }
  return texts;
}

export function extractTimelineMarkers(critique) {
  const categories = Array.isArray(critique?.categories) ? critique.categories : [];
  const seen = new Set();
  const markers = [];

  for (const category of categories) {
    const name = typeof category?.name === "string" ? category.name : "";
    if (!name) continue;
    const tone = scoreTone(category.score);
    for (const text of categoryTexts(category)) {
      for (const part of splitTimestamps(text)) {
        if (part.type !== "time") continue;
        const key = `${name}|${part.seconds}`;
        if (seen.has(key)) continue;
        seen.add(key);
        markers.push({
          id: key,
          category: name,
          label: categoryLabel(name),
          seconds: part.seconds,
          timestamp: part.value,
          tone,
          score: category.score,
        });
      }
    }
  }

  markers.sort((a, b) => a.seconds - b.seconds || a.label.localeCompare(b.label));
  return markers;
}

export function filterTimelineMarkers(markers, activeCategory) {
  const list = Array.isArray(markers) ? markers : [];
  if (!activeCategory || activeCategory === "all" || activeCategory === "All") return list;
  return list.filter(
    (marker) => marker.category === activeCategory || marker.label === activeCategory,
  );
}

export function toggleCategoryFilter(current, next) {
  if (!next || next === "all" || next === "All") return "all";
  return current === next ? "all" : next;
}

export function markerOffsetPercent(seconds, duration) {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  if (!Number.isFinite(duration) || duration <= 0) return null;
  if (seconds > duration + 0.05) return null;
  return Math.min(100, Math.max(0, (seconds / duration) * 100));
}

export function layoutTimelineMarkers(markers, duration, activeCategory) {
  const placed = [];
  const buckets = new Map();

  for (const marker of Array.isArray(markers) ? markers : []) {
    const percent = markerOffsetPercent(marker.seconds, duration);
    if (percent == null) continue;
    const bucket = Math.round(percent * 10) / 10;
    const stack = buckets.get(bucket) ?? 0;
    buckets.set(bucket, stack + 1);
    const dimmed =
      Boolean(activeCategory) && activeCategory !== "all" && marker.category !== activeCategory;
    placed.push({
      ...marker,
      percent,
      stack,
      bucket,
      dimmed,
      color: markerColor(marker.tone),
    });
  }

  return placed.map((marker) => {
    const count = buckets.get(marker.bucket) ?? 1;
    const nudge = count > 1 ? (marker.stack - (count - 1) / 2) * 12 : 0;
    return { ...marker, nudge };
  });
}
