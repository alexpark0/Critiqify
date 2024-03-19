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

  const [toggle, setToggle] = useState(1)

  function updateToggle(id) {
    setToggle(id)
  }

  return (
    <>
      <div className="alex-park-homescreen">
        <button className="button-left" onClick={()=>updateToggle(1)}>Home</button>
        <h1>ALEX PARK APP</h1>
        <button className="button-middle" onClick={()=>updateToggle(2)}>About</button>
        <button className="button-right" onClick={()=>updateToggle(3)}>Credits</button>
      </div>
      <div className={toggle === 1 ? "show-content" : "content"}>
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
      <div className={toggle === 2 ? "show-content" : "content"}>
        <h1>
          App used to record and self-critique video presentations.
        </h1>
      </div>
      <div className={toggle === 3 ? "show-content" : "content"}>
        <h1>
          Alex Park :   park.ale@northeastern.edu
        </h1>
        <h1>
          Aiden Rim :   rim.a@northeastern.edu
        </h1>
        <h1>
          Bryan Li  :   li.brya@northeastern.edu
        </h1>
        <h1>
          Colin Chu :   chu.col@northeastern.edu
        </h1>
      </div>
    </>
  );
};

export default App;
