import { useEffect, useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import TimestampText from "../playback/TimestampText.jsx";
import {
  CATEGORY_FILTERS,
  categoryLabel,
  scoreMeterModel,
  toggleCategoryFilter,
} from "../playback/markers.js";
import { feedbackTabView, nextFeedbackTab } from "../record/feedbackTabs.js";
import { startCritiqueSession } from "./critiqueClient.js";
import { toCritiqueError } from "./critiqueFormat.js";
import GeminiAlert from "./GeminiAlert.jsx";
import "./VideoCritique.css";

const PHASE_COPY = {
  prepare: "Preparing your recording…",
  upload: "Uploading this recording to Gemini…",
  process: "Processing your video…",
  grade: "Grading cadence, eye contact, filler words, and intonation…",
  retry: "Gemini's first answer couldn't be read. Trying again…",
};

function nextMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const VideoCritique = ({
  videoFile,
  question,
  onSeek,
  activeCategory = "all",
  onCategoryFilter,
  onCritique,
}) => {
  const chatFieldId = useId();
  const sessionRef = useRef(null);
  const generationRef = useRef(0);
  const logRef = useRef(null);
  const tabRefs = useRef({});
  const scrollMemory = useRef({ critique: 0, chat: 0, log: 0 });
  const critiquePanelRef = useRef(null);
  const chatPanelRef = useRef(null);
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
  const [tab, setTab] = useState("critique");
  const tabs = feedbackTabView(tab, messages.length);

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
    if (status === "ready" && critique) onCritique?.(critique);
  }, [status, critique, onCritique]);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
    scrollMemory.current.log = log.scrollTop;
  }, [messages, chatStatus]);

  const chatLocked = status !== "ready";

  const rememberScroll = (which) => {
    const panel = which === "chat" ? chatPanelRef.current : critiquePanelRef.current;
    if (panel) scrollMemory.current[which] = panel.scrollTop;
    if (logRef.current) scrollMemory.current.log = logRef.current.scrollTop;
  };

  const selectTab = (next, { focus = false } = {}) => {
    const resolved = next === "chat" ? "chat" : "critique";
    rememberScroll(tab);
    setTab(resolved);
    window.requestAnimationFrame(() => {
      const panel = resolved === "chat" ? chatPanelRef.current : critiquePanelRef.current;
      if (panel) panel.scrollTop = scrollMemory.current[resolved] || 0;
      if (resolved === "chat" && logRef.current) {
        logRef.current.scrollTop = scrollMemory.current.log || 0;
      }
      if (focus) tabRefs.current[resolved]?.focus();
    });
  };

  const onTabKeyDown = (event) => {
    const next = nextFeedbackTab(tab, event.key);
    if (next === tab && event.key !== "Home" && event.key !== "End") return;
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    selectTab(next, { focus: true });
  };

  const selectCategory = (id) => {
    onCategoryFilter?.(toggleCategoryFilter(activeCategory, id));
  };

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

  const filterLabel =
    activeCategory === "all" ? "All timeline markers" : `${categoryLabel(activeCategory)} markers on the scrubber`;

  return (
    <section
      className="panel critique-panel"
      aria-labelledby="critique-heading"
      aria-busy={status === "loading"}
    >
      <h2 id="critique-heading" className="sr-only">
        Recording feedback
      </h2>
      <div className="feedback-tabs" role="tablist" aria-label="Recording feedback">
        {[tabs.critique, tabs.chat].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`feedback-tab-${item.id}`}
            aria-controls={`feedback-panel-${item.id}`}
            aria-selected={item.selected}
            tabIndex={item.selected ? 0 : -1}
            ref={(node) => {
              tabRefs.current[item.id] = node;
            }}
            onClick={() => selectTab(item.id)}
            onKeyDown={onTabKeyDown}
          >
            {item.label}
            {item.badge ? <span className="tab-badge">{item.badge}</span> : null}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="feedback-panel-critique"
        aria-labelledby="feedback-tab-critique"
        className="tab-panel"
        hidden={tabs.critique.hidden}
        ref={critiquePanelRef}
        onScroll={(event) => {
          scrollMemory.current.critique = event.currentTarget.scrollTop;
        }}
      >
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
            detail={error.detail}
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
            <div className="filter-pills" role="group" aria-label="Filter timeline by category">
              {CATEGORY_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={activeCategory === filter.id}
                  onClick={() => selectCategory(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <p className="filter-status">{filterLabel}</p>
            <div className="category-list">
              {critique.categories.map((category) => {
                const meter = scoreMeterModel(category.score);
                const active = activeCategory === category.name;
                return (
                  <article
                    className={active ? "category-card is-active" : "category-card"}
                    key={category.name}
                  >
                    <div className="category-head">
                      <button
                        type="button"
                        className="category-name"
                        aria-pressed={active}
                        onClick={() => selectCategory(category.name)}
                      >
                        {categoryLabel(category.name)}
                      </button>
                      <div
                        className={`score-meter is-${meter.tone}`}
                        role="meter"
                        aria-valuemin={0}
                        aria-valuemax={10}
                        aria-valuenow={meter.value}
                        aria-valuetext={`${meter.value} out of 10`}
                        aria-label={`${categoryLabel(category.name)} score`}
                      >
                        <span className="score-meter-fill" style={{ width: meter.width }} />
                      </div>
                      <p className="category-score">
                        <span className={`grade-badge is-${meter.tone}`}>{category.grade}</span>
                        <span className={`score-value is-${meter.tone}`}>{category.score}/10</span>
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
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div
        role="tabpanel"
        id="feedback-panel-chat"
        aria-labelledby="feedback-tab-chat"
        className="tab-panel"
        hidden={tabs.chat.hidden}
        ref={chatPanelRef}
        onScroll={(event) => {
          scrollMemory.current.chat = event.currentTarget.scrollTop;
        }}
      >
        <div className="critique-chat">
          <h3>Ask about this recording</h3>
          {chatLocked ? (
            <p className="status">Chat unlocks after your critique is ready.</p>
          ) : messages.length === 0 ? (
            <p className="status">
              Ask a follow-up about this recording. The conversation already
              includes the video and the critique.
            </p>
          ) : null}
          {messages.length > 0 || chatStatus === "sending" ? (
            <ul
              className="chat-log"
              ref={logRef}
              aria-label="Follow-up chat"
              onScroll={(event) => {
                scrollMemory.current.log = event.currentTarget.scrollTop;
              }}
            >
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
            <GeminiAlert
              kind={chatError.kind}
              message={chatError.message}
              detail={chatError.detail}
            />
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
      </div>
    </section>
  );
};

export default VideoCritique;

VideoCritique.propTypes = {
  videoFile: PropTypes.object,
  question: PropTypes.string,
  onSeek: PropTypes.func,
  activeCategory: PropTypes.string,
  onCategoryFilter: PropTypes.func,
  onCritique: PropTypes.func,
};
