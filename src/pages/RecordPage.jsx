import { useCallback, useMemo, useRef, useState } from "react";
import VideoRecorder from "../VideoRecorder";
import { DEMO_QUESTION, isDemoMode } from "../demo/demoMode.js";
import VideoCritique from "../gemini/VideoCritique";
import { scoresFromCritique, upsertPracticeScore } from "../practice/practiceStats.js";
import { extractTimelineMarkers } from "../playback/markers.js";
import "./RecordPage.css";

const RecordPage = () => {
  const demo = isDemoMode();
  const [question, setQuestion] = useState(demo ? DEMO_QUESTION : "");
  const [videoFile, setVideoFile] = useState(null);
  const [recordingId, setRecordingId] = useState("");
  const [critique, setCritique] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const playerRef = useRef(null);
  const markers = useMemo(() => extractTimelineMarkers(critique), [critique]);

  const handleRecordingReady = useCallback((file, meta) => {
    setVideoFile(file);
    setRecordingId(meta?.id || "");
    setCritique(null);
    setActiveCategory("all");
  }, []);

  const handleCritique = useCallback((next) => {
    setCritique(next);
    if (demo || !next || !recordingId) return;
    upsertPracticeScore({
      id: recordingId,
      scores: scoresFromCritique(next),
    });
  }, [demo, recordingId]);

  const handleTakeSaved = useCallback(({ id, url }) => {
    if (demo || !id) return;
    upsertPracticeScore({ id, url });
  }, [demo]);

  return (
    <div className="record-page">
      <h1>Record a Presentation</h1>
      <p className="record-intro">
        Practice an interview question, record your answer, and get a graded
        critique of how you delivered it.
      </p>
      <div className="record-stage">
        <section className="panel recorder-panel" aria-labelledby="recorder-heading">
          <VideoRecorder
            ref={playerRef}
            question={question}
            onQuestion={setQuestion}
            markers={markers}
            activeCategory={activeCategory}
            demo={demo}
            onRecordingReady={handleRecordingReady}
            onTakeSaved={handleTakeSaved}
          />
        </section>
        <VideoCritique
          videoFile={videoFile}
          question={question}
          activeCategory={activeCategory}
          onCategoryFilter={setActiveCategory}
          onCritique={handleCritique}
          onSeek={(seconds) => playerRef.current?.seekTo(seconds)}
        />
      </div>
    </div>
  );
};

export default RecordPage;
