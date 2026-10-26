import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { layoutTimelineMarkers } from "./markers.js";
import { finiteDuration, formatClock } from "./time.js";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor" />
    </svg>
  );
}

const RecordedPlayer = forwardRef(function RecordedPlayer(
  { src, markers = [], activeCategory = "all", onTimeUpdate },
  ref,
) {
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const fixingRef = useRef(false);
  const scrubbingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fixing, setFixing] = useState(true);

  const durationRef = useRef(0);
  durationRef.current = duration;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    let cancelled = false;
    let settled = false;
    let probed = false;
    let timer = 0;
    const listeners = [];
    const listen = (type, handler) => {
      video.addEventListener(type, handler);
      listeners.push(() => video.removeEventListener(type, handler));
    };

    fixingRef.current = true;
    setFixing(true);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);

    const finish = (value) => {
      if (cancelled || settled) return;
      settled = true;
      window.clearTimeout(timer);
      fixingRef.current = false;
      setFixing(false);
      const known = finiteDuration(value) ? value : 0;
      if (known) setDuration(known);
      setCurrent(known ? Math.min(video.currentTime || 0, known) : 0);
    };

    const reveal = () => {
      if (cancelled || settled) return;
      if (finiteDuration(video.duration)) {
        if (video.currentTime > 0.05) {
          try {
            video.currentTime = 0;
          } catch {
            finish(video.duration);
          }
          return;
        }
        finish(video.duration);
        return;
      }
      if (probed && video.currentTime > 1) {
        try {
          video.currentTime = 0;
        } catch {
          finish(Number.NaN);
        }
      }
    };

    const beginFix = () => {
      if (cancelled || settled || probed) return;
      probed = true;
      if (finiteDuration(video.duration)) {
        finish(video.duration);
        return;
      }
      // MediaRecorder WebM often reports Infinity until the playhead is forced to the end.
      try {
        video.currentTime = 1e101;
      } catch {
        finish(Number.NaN);
      }
    };

    listen("loadedmetadata", beginFix);
    listen("durationchange", reveal);
    listen("seeked", reveal);
    listen("timeupdate", () => {
      if (cancelled) return;
      if (fixingRef.current) {
        reveal();
        return;
      }
      if (scrubbingRef.current || !Number.isFinite(video.currentTime)) return;
      setCurrent(video.currentTime);
      if (finiteDuration(video.duration)) {
        setDuration(video.duration);
      } else if (video.currentTime > 0.2) {
        setDuration((existing) => Math.max(existing, video.currentTime));
      }
    });
    listen("play", () => setPlaying(true));
    listen("pause", () => setPlaying(false));
    listen("ended", () => {
      setPlaying(false);
      if (finiteDuration(video.duration)) setCurrent(video.duration);
    });

    timer = window.setTimeout(() => {
      if (cancelled || settled) return;
      if (video.currentTime > 0.05) {
        try {
          video.currentTime = 0;
        } catch {
          finish(video.duration);
          return;
        }
      }
      finish(video.duration);
    }, 2000);

    if (video.readyState >= 1) beginFix();

    return () => {
      cancelled = true;
      settled = true;
      fixingRef.current = false;
      window.clearTimeout(timer);
      listeners.forEach((remove) => remove());
      video.pause();
    };
  }, [src]);

  const applySeek = useCallback((seconds, play) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(seconds)) return;
    const limit = finiteDuration(video.duration)
      ? video.duration
      : finiteDuration(durationRef.current)
        ? durationRef.current
        : seconds;
    const next = Math.min(Math.max(0, seconds), limit);
    fixingRef.current = false;
    setFixing(false);
    try {
      video.currentTime = next;
    } catch {
      return;
    }
    setCurrent(next);
    if (play) {
      const attempt = video.play();
      if (attempt) attempt.catch(() => {});
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      seekTo(seconds) {
        frameRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        applySeek(seconds, true);
      },
    }),
    [applySeek],
  );

  const toggle = () => {
    const video = videoRef.current;
    if (!video || fixingRef.current) return;
    if (video.paused) {
      const attempt = video.play();
      if (attempt) attempt.catch(() => {});
    } else {
      video.pause();
    }
  };

  const onPlayerKeyDown = (event) => {
    if (event.target.closest("button, input, textarea, a")) return;
    if (event.key === " " || event.key === "k" || event.key === "K") {
      event.preventDefault();
      toggle();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      applySeek(current - 5, false);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      applySeek(current + 5, false);
    } else if (event.key === "Home") {
      event.preventDefault();
      applySeek(0, false);
    } else if (event.key === "End") {
      event.preventDefault();
      applySeek(duration || 0, false);
    }
  };

  const safeDuration = finiteDuration(duration) ? duration : 0;
  const shownCurrent = safeDuration ? Math.min(current, safeDuration) : current;
  const progress = safeDuration ? (shownCurrent / safeDuration) * 100 : 0;
  const timeLabel = `${formatClock(shownCurrent)} of ${formatClock(safeDuration)}`;
  const timeline = useMemo(
    () => layoutTimelineMarkers(markers, safeDuration, activeCategory),
    [markers, safeDuration, activeCategory],
  );

  useEffect(() => {
    if (fixing) return;
    onTimeUpdate?.(shownCurrent);
  }, [fixing, onTimeUpdate, shownCurrent]);

  return (
    <div className="preview-frame has-playback" ref={frameRef}>
      <video
        ref={videoRef}
        className={fixing ? "recorded is-fixing" : "recorded"}
        src={src}
        playsInline
        preload="auto"
        onClick={toggle}
      />
      <div
        className="playback-bar"
        role="group"
        aria-label="Playback controls"
        tabIndex={0}
        onKeyDown={onPlayerKeyDown}
      >
        <button
          type="button"
          className="playback-toggle"
          onClick={toggle}
          disabled={fixing}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <span className="playback-time">{formatClock(shownCurrent)}</span>
        <div className="scrubber">
          <input
            type="range"
            min={0}
            max={safeDuration || 0}
            step={0.1}
            value={Number.isFinite(shownCurrent) ? shownCurrent : 0}
            disabled={!safeDuration}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(safeDuration)}
            aria-valuenow={Math.round(shownCurrent) || 0}
            aria-valuetext={timeLabel}
            style={{ "--seek": `${progress}%` }}
            onInput={(event) => applySeek(Number(event.target.value), false)}
            onPointerDown={() => {
              scrubbingRef.current = true;
            }}
            onPointerUp={() => {
              scrubbingRef.current = false;
            }}
            onKeyDown={(event) => {
              const jump =
                event.key === "ArrowRight" ? 5 : event.key === "ArrowLeft" ? -5 : 0;
              if (jump) {
                event.preventDefault();
                scrubbingRef.current = true;
                applySeek(shownCurrent + jump, false);
                return;
              }
              if (event.key === "Home") {
                event.preventDefault();
                applySeek(0, false);
                return;
              }
              if (event.key === "End") {
                event.preventDefault();
                applySeek(safeDuration, false);
                return;
              }
              scrubbingRef.current = true;
            }}
            onKeyUp={() => {
              scrubbingRef.current = false;
            }}
            onBlur={() => {
              scrubbingRef.current = false;
            }}
          />
          <div className="timeline-markers">
            {timeline.map((marker) => (
              <button
                key={marker.id}
                type="button"
                className={marker.dimmed ? "timeline-marker is-dimmed" : "timeline-marker"}
                style={{
                  "--at": `${marker.percent}%`,
                  "--nudge": `${marker.nudge}px`,
                  "--marker": marker.color,
                }}
                aria-label={`${marker.label} at ${marker.timestamp}. Seek to this moment.`}
                onClick={(event) => {
                  event.stopPropagation();
                  applySeek(marker.seconds, true);
                }}
              >
                <span className="marker-tip" aria-hidden="true">
                  {marker.timestamp} · {marker.label}
                </span>
              </button>
            ))}
          </div>
        </div>
        <span className="playback-time is-total">{formatClock(safeDuration)}</span>
      </div>
    </div>
  );
});

RecordedPlayer.propTypes = {
  src: PropTypes.string.isRequired,
  markers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      seconds: PropTypes.number.isRequired,
      timestamp: PropTypes.string.isRequired,
      tone: PropTypes.string.isRequired,
    }),
  ),
  activeCategory: PropTypes.string,
  onTimeUpdate: PropTypes.func,
};

export default RecordedPlayer;
