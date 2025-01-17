import VideoRecorder from "../VideoRecorder";
import AudioRecorder from "../AudioRecorder";
import GeminiTips from "../gemini/GeminiTips";
import { useState } from "react";
import SampleQuestion from "../gemini/SampleQuestion";
import "./RecordPage.css"

const RecordPage = () => {
  let [recordOption, setRecordOption] = useState("video");
  const toggleRecordOption = (type) => {
    return () => {
      setRecordOption(type);
    };
  };

  return (
    <div className="record-page">
      <h2>Record a Presentation!</h2>
      <SampleQuestion></SampleQuestion>
      <div className="button-flex">
        <button onClick={toggleRecordOption("video")}>Record Video</button>
        <button onClick={toggleRecordOption("audio")}>Record Audio</button>
      </div>
      <div>
        {recordOption === "video" ? <VideoRecorder /> : <AudioRecorder />}
      </div>
      <GeminiTips />
    </div>
  );
};

export default RecordPage;
