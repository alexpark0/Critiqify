import { useRef, useState } from "react";
import VideoRecorder from "../VideoRecorder";
import SampleQuestion from "../gemini/SampleQuestion";
import VideoCritique from "../gemini/VideoCritique";
import "./RecordPage.css";

const RecordPage = () => {
  const [question, setQuestion] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const playerRef = useRef(null);

  return (
    <div className="record-page">
      <h1>Record a Presentation</h1>
      <p className="record-intro">
        Practice an interview question, record your answer, and get a graded
        critique of how you delivered it.
      </p>
      <section className="panel" aria-labelledby="question-heading">
        <h2 id="question-heading">Practice question</h2>
        <SampleQuestion onQuestion={setQuestion} />
      </section>
      <div className="record-stage">
        <section className="panel recorder-panel" aria-labelledby="recorder-heading">
          <VideoRecorder ref={playerRef} onRecordingReady={setVideoFile} />
        </section>
        <VideoCritique
          videoFile={videoFile}
          question={question}
          onSeek={(seconds) => playerRef.current?.seekTo(seconds)}
        />
      </div>
    </div>
  );
};

export default RecordPage;
