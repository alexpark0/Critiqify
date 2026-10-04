import { useEffect, useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import { startCritiqueSession } from "./critiqueClient.js";
import { toCritiqueError } from "./critiqueFormat.js";
import GeminiAlert from "./GeminiAlert.jsx";
import TimestampText from "../playback/TimestampText.jsx";
import "./VideoCritique.css";

const PHASE_COPY = {
  prepare: "Preparing your recording…",
  upload: "Uploading this recording to Gemini…",
  process: "Processing your video…",
  grade: "Grading cadence, eye contact, filler words, and intonation…",
};

function nextMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const VideoCritique = ({ videoFile, question, onSeek }) => {
  const chatFieldId = useId();
  const sessionRef = useRef(null);
  const generationRef = useRef(0);
  const logRef = useRef(null);
  const [retryCount, setRetryCount] = useState(0);
  const [status, setStatus] = useState(videoFile ? "loading" : "empty");
  const [phase, setPhase] = useState("prepare");
  const [critique, setCritique] = useState(null);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [chatStatus, setChatStatus] = useState("idle");
  const [chatError, setChatError] = useState(null);
  const [liveReply, setLiveReply] = useState("");

  useEffect(() => {
    if (!videoFile) {
      generationRef.current += 1;
      sessionRef.current = null;
      setStatus("empty");
      setCritique(null);
      setError(null);
      setMessages([]);
      setChatError(null);
      setChatStatus("idle");
      setLiveReply("");
      return undefined;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const controller = new AbortController();
    sessionRef.current = null;
    setStatus("loading");
    setPhase("prepare");
    setCritique(null);
    setError(null);
    setMessages([]);
    setChatError(null);
    setChatStatus("idle");
    setLiveReply("");

    startCritiqueSession({
      videoFile,
      question,
      signal: controller.signal,
      onProgress: (nextPhase) => {
        if (generationRef.current !== generation) return;
        setPhase(nextPhase);
      },
    })
      .then((session) => {
        if (generationRef.current !== generation) return;
        sessionRef.current = session;
        setCritique(session.critique);
        setStatus("ready");
      })
      .catch((caught) => {
        if (controller.signal.aborted || generationRef.current !== generation) return;
        const parsed = toCritiqueError(caught);
        if (parsed.kind === "aborted") return;
        setError(parsed);
        setStatus("error");
      });

    return () => {
      generationRef.current += 1;
      controller.abort();
    };
  }, [videoFile, question, retryCount]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, chatStatus]);

  const chatLocked = status !== "ready";

  const sendFollowUp = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    const session = sessionRef.current;
    if (!text || chatLocked || chatStatus === "sending" || !session) return;

    const generation = generationRef.current;
    setDraft("");
    setChatError(null);
    setChatStatus("sending");
    setMessages((current) => [
      ...current,
      { id: nextMessageId(), role: "user", text },
    ]);

    try {
      const reply = await session.ask(text);
      if (generationRef.current !== generation) return;
      setMessages((current) => [
        ...current,
        { id: nextMessageId(), role: "model", text: reply },
      ]);
      setLiveReply(reply);
      setChatStatus("idle");
    } catch (caught) {
      if (generationRef.current !== generation) return;
      const parsed = toCritiqueError(caught);
      if (parsed.kind === "aborted") return;
      setChatError(parsed);
      setChatStatus("idle");
    }
  };

  return (
    <section
      className="panel critique-panel"
      aria-labelledby="critique-heading"
      aria-busy={status === "loading"}
    >
      <h2 id="critique-heading">Critique</h2>
      {question ? (
        <p className="critique-question">
          <span>Practice question. </span>
          {question}
        </p>
      ) : null}

      {status === "empty" ? (
        <p className="status critique-empty">
          Record your answer to get grades for cadence, eye contact, filler
          words, and intonation.
        </p>
      ) : null}

      {status === "loading" ? (
        <p className="status" role="status">
          {PHASE_COPY[phase] ?? PHASE_COPY.prepare}
        </p>
      ) : null}

      {status === "error" && error ? (
        <GeminiAlert
          kind={error.kind}
          message={error.message}
          onRetry={() => setRetryCount((count) => count + 1)}
        />
      ) : null}

      {status === "ready" && critique ? (
        <div className="critique-body">
          <div className="summary-block">
            <h3>Overall</h3>
            <p>
              <TimestampText text={critique.summary} onSeek={onSeek} />
            </p>
          </div>
          {critique.addressedQuestion ? (
            <div className="summary-block">
              <h3>Did you answer it?</h3>
              <p>
                <TimestampText text={critique.addressedQuestion} onSeek={onSeek} />
              </p>
            </div>
          ) : null}
          <div className="category-list">
            {critique.categories.map((category) => (
              <article className="category-card" key={category.name}>
                <div className="category-head">
                  <h3>{category.name}</h3>
                  <p className="category-score">
                    <span className="grade-badge">{category.grade}</span>
                    <span className="score-value">{category.score}/10</span>
                  </p>
                </div>
                <p>
                  <TimestampText text={category.explanation} onSeek={onSeek} />
                </p>
                <p className="tips-label">Try this</p>
                <ul className="tips">
                  {category.tips.map((tip, index) => (
                    <li key={`${category.name}-${index}`}>
                      <TimestampText text={tip} onSeek={onSeek} />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="critique-chat">
        <h3>Ask about this recording</h3>
        {chatLocked ? (
          <p className="status">Chat unlocks after your critique is ready.</p>
        ) : messages.length === 0 ? (
          <p className="status">
            Ask a follow-up about this recording. The conversation already
            includes the video and the critique above.
          </p>
        ) : null}
        {messages.length > 0 || chatStatus === "sending" ? (
          <ul className="chat-log" ref={logRef} aria-label="Follow-up chat">
            {messages.map((message) => (
              <li
                key={message.id}
                className={
                  message.role === "user"
                    ? "chat-bubble is-user"
                    : "chat-bubble is-model"
                }
              >
                <span className="chat-role">
                  {message.role === "user" ? "You" : "Gemini"}
                </span>
                <p>
                  <TimestampText text={message.text} onSeek={onSeek} />
                </p>
              </li>
            ))}
            {chatStatus === "sending" ? (
              <li className="chat-bubble is-model" aria-busy="true">
                <span className="chat-role">Gemini</span>
                <p>Thinking…</p>
              </li>
            ) : null}
          </ul>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {liveReply}
        </p>
        {chatError ? (
          <GeminiAlert kind={chatError.kind} message={chatError.message} />
        ) : null}
        <form onSubmit={sendFollowUp}>
          <div className="inline-field">
            <div className="grow">
              <label htmlFor={chatFieldId}>Follow-up question</label>
              <textarea
                id={chatFieldId}
                rows={2}
                value={draft}
                disabled={chatLocked || chatStatus === "sending"}
                placeholder={
                  chatLocked
                    ? "Available after the critique"
                    : "Ask about a grade, a timestamp, or what to try next"
                }
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
            </div>
            <button
              type="submit"
              disabled={chatLocked || chatStatus === "sending" || !draft.trim()}
            >
              {chatStatus === "sending" ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default VideoCritique;

VideoCritique.propTypes = {
  videoFile: PropTypes.object,
  question: PropTypes.string,
  onSeek: PropTypes.func,
};
