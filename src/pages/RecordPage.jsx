import VideoRecorder from "../VideoRecorder";
import GeminiTips from "../gemini/GeminiTips";
import SampleQuestion from "../gemini/SampleQuestion";
import "./RecordPage.css";

const RecordPage = () => {
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
      <section className="panel" aria-labelledby="recorder-heading">
        <VideoRecorder />
      </section>
      <section className="panel" aria-labelledby="tips-heading">
        <h2 id="tips-heading">Ask AI for tips</h2>
        <GeminiTips />
      </section>
    </div>
  );
};

export default RecordPage;
