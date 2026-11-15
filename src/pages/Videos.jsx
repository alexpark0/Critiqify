import "./Videos.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { isDemoMode } from "../demo/demoMode.js";
import PracticeSummary from "../practice/PracticeSummary.jsx";
import {
  demoLogVideos,
  demoScoreRecords,
  formatLogDate,
  readScoreStore,
  summarizePractice,
} from "../practice/practiceStats.js";

const supabaseUrl = "https://hngxaylgylmtakwbxzss.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZ3hheWxneWxtdGFrd2J4enNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NDQ4ODksImV4cCI6MjA1MjEyMDg4OX0.PfvbMIX6IByuf6kTWQgykjwHta6IdDmBioy-xJhTTJQ";
const supabase = createClient(supabaseUrl, supabaseKey);

const SCORE_LABELS = [
  ["Cadence", "cadence"],
  ["Eye contact", "eyeContact"],
  ["Filler words", "fillerWords"],
  ["Intonation", "intonation"],
];

function ScoreChips({ scores }) {
  return (
    <ul className="log-scores">
      {SCORE_LABELS.map(([label, field]) => {
        const value = scores[field];
        const tone = Number(value) >= 7 ? "is-strong" : "is-flag";
        return (
          <li key={field} className={`log-score ${tone}`}>
            {label} {Number.isFinite(value) ? value : "—"}
          </li>
        );
      })}
      <li className="log-score">
        Avg {Number.isFinite(scores.average) ? scores.average.toFixed(1) : "—"}
      </li>
    </ul>
  );
}

ScoreChips.propTypes = {
  scores: PropTypes.shape({
    cadence: PropTypes.number,
    eyeContact: PropTypes.number,
    fillerWords: PropTypes.number,
    intonation: PropTypes.number,
    average: PropTypes.number,
  }).isRequired,
};

const Logs = () => {
  const demo = isDemoMode();
  const demoRecords = useMemo(() => (demo ? demoScoreRecords(new Date()) : null), [demo]);
  const [videos, setVideos] = useState([]);
  const [status, setStatus] = useState(demo ? "ready" : "loading");
  const [brokenLinks, setBrokenLinks] = useState({});

  const getVideos = useCallback(async () => {
    if (demo) return;
    setStatus("loading");
    try {
      const { data, error } = await supabase.from("videos").select("*");
      if (error || data === null) {
        setVideos([]);
        setStatus("error");
        return;
      }
      setVideos(data);
      setStatus("ready");
    } catch {
      setVideos([]);
      setStatus("error");
    }
  }, [demo]);

  useEffect(() => {
    getVideos();
  }, [getVideos]);

  const records = demoRecords ?? readScoreStore();
  const sourceVideos = demo ? demoLogVideos(demoRecords) : status === "ready" ? videos : [];
  const summary = summarizePractice({
    videos: sourceVideos,
    records: demo || status !== "loading" ? records : [],
  });
  const showSummary = demo || status !== "loading";

  return (
    <div className="logs-page">
      <h1>Logs</h1>
      <p className="logs-intro">
        Recordings you have saved from the practice page.
      </p>
      {showSummary ? <PracticeSummary summary={summary} /> : null}
      {status === "loading" ? (
        <p className="status" role="status">
          Loading recordings…
        </p>
      ) : null}
      {status === "error" ? (
        <div className="page-message" role="alert">
          <p className="status status-error">
            We could not load your recordings. The storage service may be
            unavailable.
          </p>
          <button type="button" onClick={getVideos}>
            Try again
          </button>
        </div>
      ) : null}
      {(demo || status === "ready") && summary.rows.length === 0 ? (
        <div className="page-message">
          <p>No recordings yet.</p>
          <Link to="/record" className="button">
            Record a presentation
          </Link>
        </div>
      ) : null}
      <div className="logs-container">
        {demo || status === "ready"
          ? summary.rows.map((video) => (
              <article key={video.key} className="log-card">
                <h2>Date: {formatLogDate(video.date)}</h2>
                {video.link ? (
                  brokenLinks[video.key] ? (
                    <p className="status status-error" role="alert">
                      This recording could not be played.
                    </p>
                  ) : (
                    <video
                      className="log-video"
                      controls
                      preload="metadata"
                      onError={() =>
                        setBrokenLinks((current) => ({
                          ...current,
                          [video.key]: true,
                        }))
                      }
                    >
                      <source src={video.link} type="video/webm" />
                    </video>
                  )
                ) : (
                  <p className="log-local-note">
                    Scores for this take are saved on this device. Save the
                    recording to store the video.
                  </p>
                )}
                {video.scores ? <ScoreChips scores={video.scores} /> : null}
                <div className="log-notes">
                  Notes: {video.notes?.trim() ? video.notes : "None"}
                </div>
              </article>
            ))
          : null}
      </div>
    </div>
  );
};

export default Logs;
