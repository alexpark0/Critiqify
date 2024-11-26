import VideoRecorder from "../VideoRecorder";
import AudioRecorder from "../AudioRecorder";
import Gemini from "../gemini/GeminiTips";
import { useState } from "react";
import SampleQuestion from "../gemini/SampleQuestion";

const RecordPage = () => {
  let [recordOption, setRecordOption] = useState("video");
  const toggleRecordOption = (type) => {
    return () => {
      setRecordOption(type);
    };
  };

  return (
    <>
      <h2>Record a Presentation!</h2>
      <SampleQuestion></SampleQuestion>
      <div className="button-flex">
        <button onClick={toggleRecordOption("video")}>Record Video</button>
        <button onClick={toggleRecordOption("audio")}>Record Audio</button>
      </div>
      <div>
        {recordOption === "video" ? <VideoRecorder /> : <AudioRecorder />}
      </div>
      <Gemini />
    </>
  );
};

export default RecordPage;
