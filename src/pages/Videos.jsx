import "./Videos.css";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hngxaylgylmtakwbxzss.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZ3hheWxneWxtdGFrd2J4enNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NDQ4ODksImV4cCI6MjA1MjEyMDg4OX0.PfvbMIX6IByuf6kTWQgykjwHta6IdDmBioy-xJhTTJQ";
const supabase = createClient(supabaseUrl, supabaseKey);

function formatLogDate(value) {
  const match = /^(\d+)-(\d+)-(\d+)-(\d+)\.(\d+)\.(\d+)$/.exec(value ?? "");
  if (!match) return value || "Unknown date";
  const [, month, day, year, hours, minutes] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
  );
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const Logs = () => {
  const [videos, setVideos] = useState([]);
  const [status, setStatus] = useState("loading");
  const [brokenLinks, setBrokenLinks] = useState({});

  const getVideos = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    getVideos();
  }, [getVideos]);

  return (
    <div className="logs-page">
      <h1>Logs</h1>
      <p className="logs-intro">
        Recordings you have saved from the practice page.
      </p>
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
      {status === "ready" && videos.length === 0 ? (
        <div className="page-message">
          <p>No recordings yet.</p>
          <Link to="/record" className="button">
            Record a presentation
          </Link>
        </div>
      ) : null}
      <div className="logs-container">
        {status === "ready"
          ? videos.map((video, index) => {
              const key = video.link || `${video.date}-${index}`;
              return (
                <article key={key} className="log-card">
                  <h2>Date: {formatLogDate(video.date)}</h2>
                  {brokenLinks[key] ? (
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
                          [key]: true,
                        }))
                      }
                    >
                      <source src={video.link} type="video/webm" />
                    </video>
                  )}
                  <div className="log-notes">
                    Notes: {video.notes?.trim() ? video.notes : "None"}
                  </div>
                </article>
              );
            })
          : null}
      </div>
    </div>
  );
};

export default Logs;
