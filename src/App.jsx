import "./App.css";
import { useState, useRef } from "react";
import VideoRecorder from "../src/VideoRecorder";
import AudioRecorder from "../src/AudioRecorder";

const App = () => {
  let [recordOption, setRecordOption] = useState("video");
  const toggleRecordOption = (type) => {
    return () => {
      setRecordOption(type);
    };
  };
  return (
    <>
      <div className="alex-park-homescreen">
        <button className="button-left">Home</button>
        <button className="button-middle">About</button>
        <button className="button-middle">Services</button>
        <button className="button-right">Contact</button>
      </div>
      <div>
        <h1>Alex Park App</h1>
        <h2>Record yourself doing a presentation!</h2>
        <img src="IMG_2921.jpg" alt="alex park" width="1024" height="256"></img>
        <div className="button-flex">
          <button onClick={toggleRecordOption("video")}>Record Video</button>
          <button onClick={toggleRecordOption("audio")}>Record Audio</button>
        </div>
        <div>
          {recordOption === "video" ? <VideoRecorder /> : <AudioRecorder />}
        </div>
      </div>
      <p>
        fuck you alex park why doesn't your bitch ass actually come to oasis
        meetings
      </p>
      <p>kasa looking headass ricky montgomery looking headass</p>
    </>
  );
};

export default App;
