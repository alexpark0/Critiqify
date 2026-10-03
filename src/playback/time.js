const TIMESTAMP = /(?<!\d)(?:(\d{1,2}):)?(\d{1,2}):([0-5]\d)(?!\d)/g;

export function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const padded = String(secs).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${padded}`;
  return `${minutes}:${padded}`;
}

export function timestampToSeconds(hours, minutes, seconds) {
  return (hours || 0) * 3600 + minutes * 60 + seconds;
}

export function splitTimestamps(text) {
  const source = typeof text === "string" ? text : "";
  const parts = [];
  let last = 0;
  for (const match of source.matchAll(TIMESTAMP)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: "text", value: source.slice(last, index) });
    const hours = match[1] ? Number(match[1]) : 0;
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    if (match[1] && minutes > 59) {
      parts.push({ type: "text", value: match[0] });
    } else {
      parts.push({
        type: "time",
        value: match[0],
        seconds: timestampToSeconds(hours, minutes, seconds),
      });
    }
    last = index + match[0].length;
  }
  if (last < source.length) parts.push({ type: "text", value: source.slice(last) });
  return parts;
}

export function finiteDuration(value) {
  return Number.isFinite(value) && value > 0 && value < 1e8;
}
