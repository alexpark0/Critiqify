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
  const [val, setVal] = useState("Enter Critiques Here");
  const click = () => {
    alert(val);
  };
  const change = (event) => {
    setVal(event.target.value);
  };
  return (
    <>
      <div className="alex-park-homescreen">
        <button className="button-left">Home</button>
        <h1>ALEX PARK APP</h1>
        <button className="button-middle">About</button>
        <button className="button-right">Contact</button>
      </div>
      <div>
        <h2>Record Yourself Doing a Presentation!</h2>
        <div className="button-flex">
          <button onClick={toggleRecordOption("video")}>Record Video</button>
          <button onClick={toggleRecordOption("audio")}>Record Audio</button>
        </div>
        <div>
          {recordOption === "video" ? <VideoRecorder /> : <AudioRecorder />}
        </div>
        <div className="textbox">
          <form>
            <label>
              Critique:
              <input type="text" name="lastCritique" />
            </label>
            <input type="submit" value="Enter" />
          </form>
        </div>
      </div>
    </>
  );
};

export default App;
