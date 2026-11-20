import "./Videos.css";
import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { isDemoMode } from "../demo/demoMode.js";
import {
  LOG_COPY,
  deletePrompt,
  deleteSavedLog,
  logActionKey,
  removeDemoRecord,
  removeDemoVideo,
  replaceDemoRecordNotes,
  replaceDemoVideoNotes,
  sameDatabaseId,
  saveLogNotes,
} from "../logs/logActions.js";
import PracticeSummary from "../practice/PracticeSummary.jsx";
import {
  demoLogVideos,
  demoScoreRecords,
  formatLogDate,
  readScoreStore,
  summarizePractice,
} from "../practice/practiceStats.js";

const supabaseUrl = "https://dciyttpbryiswtotblbz.supabase.co";
const supabaseKey =
  "sb_publishable_mWYgc6UT2RSMdpQc8L193A_svC6fGND";
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

function notesFieldId(actionKey) {
  return `log-notes-${String(actionKey).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function LogCard({
  video,
  demo,
  broken,
  editing,
  confirming,
  pending,
  busy,
  draft,
  error,
  notice,
  onBroken,
  onDraft,
  onEdit,
  onCancelEdit,
  onSave,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}) {
  const actionKey = logActionKey(video);
  const notesId = notesFieldId(actionKey);
  const when = formatLogDate(video.date);
  return (
    <article className="log-card" aria-busy={pending}>
      <h2>Date: {when}</h2>
      {video.link ? (
        broken ? (
          <p className="status status-error" role="alert">
            This recording could not be played.
          </p>
        ) : (
          <video
            className="log-video"
            controls
            preload="metadata"
            onError={() => onBroken(actionKey)}
          >
            <source src={video.link} type="video/webm" />
          </video>
        )
      ) : (
        <p className="log-local-note">
          Scores for this take are saved on this device. Save the recording to
          store the video.
        </p>
      )}
      {video.scores ? <ScoreChips scores={video.scores} /> : null}
      {editing ? (
        <form
          className="log-edit"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(video);
          }}
        >
          <div className="field">
            <label htmlFor={notesId}>Notes</label>
            <textarea
              id={notesId}
              rows={3}
              value={draft}
              autoFocus
              onChange={(event) => onDraft(event.target.value)}
              disabled={pending}
            />
          </div>
          {error ? (
            <p className="status status-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="log-actions">
            <button type="submit" disabled={busy}>
              {pending ? "Saving…" : "Save notes"}
            </button>
            <button
              type="button"
              className="button-quiet"
              onClick={onCancelEdit}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="log-notes">
            Notes: {video.notes?.trim() ? video.notes : "None"}
          </div>
          {error ? (
            <p className="status status-error" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="status status-ok" role="status">
              {notice}
            </p>
          ) : null}
          {confirming ? (
            <div className="log-confirm">
              <p id={`${notesId}-confirm`}>{deletePrompt(video, { demo })}</p>
              <div className="log-actions">
                <button
                  type="button"
                  className="button-danger"
                  onClick={() => onConfirmDelete(video)}
                  disabled={busy}
                  aria-describedby={`${notesId}-confirm`}
                >
                  {pending ? "Deleting…" : "Delete log"}
                </button>
                <button
                  type="button"
                  className="button-quiet"
                  onClick={onCancelDelete}
                  disabled={busy}
                  autoFocus
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="log-actions">
              <button
                type="button"
                onClick={() => onEdit(video)}
                disabled={busy}
                aria-label={`Edit notes for ${when}`}
              >
                Edit notes
              </button>
              <button
                type="button"
                className="button-danger"
                onClick={() => onAskDelete(video)}
                disabled={busy}
                aria-label={`Delete log from ${when}`}
              >
                Delete
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}

LogCard.propTypes = {
  video: PropTypes.shape({
    key: PropTypes.string,
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    date: PropTypes.string,
    link: PropTypes.string,
    notes: PropTypes.string,
    localOnly: PropTypes.bool,
    scores: PropTypes.shape({
      cadence: PropTypes.number,
      eyeContact: PropTypes.number,
      fillerWords: PropTypes.number,
      intonation: PropTypes.number,
      average: PropTypes.number,
    }),
  }).isRequired,
  demo: PropTypes.bool.isRequired,
  broken: PropTypes.bool.isRequired,
  editing: PropTypes.bool.isRequired,
  confirming: PropTypes.bool.isRequired,
  pending: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  draft: PropTypes.string.isRequired,
  error: PropTypes.string.isRequired,
  notice: PropTypes.string.isRequired,
  onBroken: PropTypes.func.isRequired,
  onDraft: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onAskDelete: PropTypes.func.isRequired,
  onCancelDelete: PropTypes.func.isRequired,
  onConfirmDelete: PropTypes.func.isRequired,
};

const Logs = () => {
  const demo = isDemoMode();
  const [demoState, setDemoState] = useState(() => {
    if (!isDemoMode()) return null;
    const records = demoScoreRecords(new Date());
    return { records, videos: demoLogVideos(records) };
  });
  const [videos, setVideos] = useState([]);
  const [status, setStatus] = useState(demo ? "ready" : "loading");
  const [brokenLinks, setBrokenLinks] = useState({});
  const [, setScoreRevision] = useState(0);
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState("");
  const [confirmKey, setConfirmKey] = useState(null);
  const [pendingKey, setPendingKey] = useState(null);
  const [cardError, setCardError] = useState(null);
  const [cardNotice, setCardNotice] = useState(null);
  const [notice, setNotice] = useState("");
  const [pageError, setPageError] = useState("");
  const pendingRef = useRef(false);
  const requestRef = useRef(0);

  const getVideos = useCallback(async () => {
    if (demo) return;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setStatus("loading");
    try {
      const { data, error } = await supabase.from("videos").select("*");
      if (requestId !== requestRef.current) return;
      if (error || data === null) {
        setVideos([]);
        setStatus("error");
        return;
      }
      setVideos(data);
      setStatus("ready");
    } catch {
      if (requestId !== requestRef.current) return;
      setVideos([]);
      setStatus("error");
    }
  }, [demo]);

  useEffect(() => {
    getVideos();
  }, [getVideos]);

  useEffect(() => {
    if (!editingKey && !confirmKey) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || pendingRef.current) return;
      setEditingKey(null);
      setConfirmKey(null);
      setCardError(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingKey, confirmKey]);

  const records = demoState ? demoState.records : readScoreStore();
  const sourceVideos = demoState
    ? demoState.videos
    : status === "ready"
      ? videos
      : [];
  const summary = summarizePractice({
    videos: sourceVideos,
    records: demo || status !== "loading" ? records : [],
  });
  const showSummary = demo || status !== "loading";

  const startEdit = (video) => {
    if (pendingRef.current) return;
    setEditingKey(logActionKey(video));
    setDraft(video.notes || "");
    setConfirmKey(null);
    setCardError(null);
    setCardNotice(null);
    setNotice("");
  };

  const startDelete = (video) => {
    if (pendingRef.current) return;
    setConfirmKey(logActionKey(video));
    setEditingKey(null);
    setCardError(null);
    setCardNotice(null);
    setNotice("");
  };

  const cancelEdit = () => {
    if (pendingRef.current) return;
    setEditingKey(null);
    setCardError(null);
  };

  const cancelDelete = () => {
    if (pendingRef.current) return;
    setConfirmKey(null);
    setCardError(null);
  };

  const handleSaveNotes = async (video) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    const actionKey = logActionKey(video);
    const draftNotes = draft;
    setPendingKey(actionKey);
    setCardError(null);
    try {
      const result = await saveLogNotes({
        demo,
        client: demo ? null : supabase,
        log: video,
        notes: draftNotes,
      });
      if (!result.ok) {
        setCardError({ key: actionKey, message: result.message });
        return;
      }
      if (result.demo) {
        setDemoState((current) =>
          current
            ? {
                videos: replaceDemoVideoNotes(
                  current.videos,
                  video,
                  result.notes,
                ),
                records: replaceDemoRecordNotes(
                  current.records,
                  video,
                  result.notes,
                ),
              }
            : current,
        );
      } else if (!result.local) {
        setVideos((current) =>
          current.map((item) =>
            sameDatabaseId(item.id, video.id)
              ? { ...item, notes: result.notes }
              : item,
          ),
        );
        setScoreRevision((value) => value + 1);
      } else {
        setScoreRevision((value) => value + 1);
      }
      setEditingKey(null);
      setCardNotice({ key: actionKey, message: LOG_COPY.notesSaved });
    } finally {
      pendingRef.current = false;
      setPendingKey(null);
    }
  };

  const handleConfirmDelete = async (video) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    const actionKey = logActionKey(video);
    setPendingKey(actionKey);
    setCardError(null);
    setPageError("");
    try {
      const result = await deleteSavedLog({
        demo,
        client: demo ? null : supabase,
        log: video,
      });
      if (result.demo) {
        setDemoState((current) =>
          current
            ? {
                videos: removeDemoVideo(current.videos, video),
                records: removeDemoRecord(current.records, video),
              }
            : current,
        );
        setConfirmKey(null);
        setCardNotice(null);
        setNotice(LOG_COPY.deletedDemo);
        return;
      }
      if (!result.ok && !result.rowDeleted) {
        setCardError({ key: actionKey, message: result.message });
        return;
      }
      if (!result.local) {
        setVideos((current) =>
          current.filter((item) => !sameDatabaseId(item.id, video.id)),
        );
      }
      setScoreRevision((value) => value + 1);
      setConfirmKey(null);
      setEditingKey(null);
      setCardNotice(null);
      if (result.ok) {
        setNotice(result.local ? LOG_COPY.deletedLocal : LOG_COPY.deleted);
      } else {
        setNotice("");
        setPageError(result.message);
      }
    } finally {
      pendingRef.current = false;
      setPendingKey(null);
    }
  };

  return (
    <div className="logs-page">
      <h1>Logs</h1>
      <p className="logs-intro">
        Recordings you have saved from the practice page.
      </p>
      {showSummary ? <PracticeSummary summary={summary} /> : null}
      {notice ? (
        <p className="status status-ok log-banner" role="status">
          {notice}
        </p>
      ) : null}
      {pageError ? (
        <p className="status status-error log-banner" role="alert">
          {pageError}
        </p>
      ) : null}
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
          ? summary.rows.map((video) => {
              const actionKey = logActionKey(video);
              return (
                <LogCard
                  key={video.key}
                  video={video}
                  demo={demo}
                  broken={Boolean(brokenLinks[actionKey])}
                  editing={editingKey === actionKey}
                  confirming={confirmKey === actionKey}
                  pending={pendingKey === actionKey}
                  busy={pendingKey !== null}
                  draft={editingKey === actionKey ? draft : ""}
                  error={cardError?.key === actionKey ? cardError.message : ""}
                  notice={
                    cardNotice?.key === actionKey ? cardNotice.message : ""
                  }
                  onBroken={(key) =>
                    setBrokenLinks((current) => ({
                      ...current,
                      [key]: true,
                    }))
                  }
                  onDraft={setDraft}
                  onEdit={startEdit}
                  onCancelEdit={cancelEdit}
                  onSave={handleSaveNotes}
                  onAskDelete={startDelete}
                  onCancelDelete={cancelDelete}
                  onConfirmDelete={handleConfirmDelete}
                />
              );
            })
          : null}
      </div>
    </div>
  );
};

export default Logs;
