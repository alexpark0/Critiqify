import VideoRecorder from "../VideoRecorder";
import AudioRecorder from "../AudioRecorder";
import GeminiTips from "../gemini/GeminiTips";
import { useState } from "react";
import SampleQuestion from "../gemini/SampleQuestion";
import "./RecordPage.css";

const RecordPage = () => {
  const [recordOption, setRecordOption] = useState("video");

  return (
    <div className="record-page">
      <h1>Record a Presentation</h1>
      <p className="record-intro">
        Practice an interview question, record your answer, and ask for
        feedback.
      </p>
      <section className="panel" aria-labelledby="question-heading">
        <h2 id="question-heading">Practice question</h2>
        <SampleQuestion />
      </section>
      <div className="segmented" role="group" aria-label="Recording type">
        <button
          type="button"
          className={recordOption === "video" ? "is-active" : undefined}
          aria-pressed={recordOption === "video"}
          onClick={() => setRecordOption("video")}
        >
          Record Video
        </button>
        <button
          type="button"
          className={recordOption === "audio" ? "is-active" : undefined}
          aria-pressed={recordOption === "audio"}
          onClick={() => setRecordOption("audio")}
        >
          Record Audio
        </button>
      </div>
      <section className="panel" aria-labelledby="recorder-heading">
        {recordOption === "video" ? <VideoRecorder /> : <AudioRecorder />}
      </section>
      <section className="panel" aria-labelledby="tips-heading">
        <h2 id="tips-heading">Ask AI for tips</h2>
        <GeminiTips />
      </section>
    </div>
  );
};

export default RecordPage;
