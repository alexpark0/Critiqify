import "./App.css";
import { useState } from "react";
import VideoRecorder from "../src/VideoRecorder";
import AudioRecorder from "../src/AudioRecorder";
import Gemini from "./Gemini";

const App = () => {
  let [recordOption, setRecordOption] = useState("video");
  const toggleRecordOption = (type) => {
    return () => {
      setRecordOption(type);
    };
  };

  const [toggle, setToggle] = useState(1);

  function updateToggle(id) {
    setToggle(id);
  }

  return (
    <>
      <div className="alex-park-homescreen">
        <button className="button-left" onClick={() => updateToggle(1)}>
          About
        </button>
        <h1>CRITIQIFY</h1>
        <button className="button-middle" onClick={() => updateToggle(2)}>
          Record
        </button>
        <button className="button-right" onClick={() => updateToggle(3)}>
          Credits
        </button>
      </div>
      <div className={toggle === 1 ? "show-content" : "content"}>
        <h2>
          Critiqify is an app used to record and self-critique video
          presentations.
        </h2>
        <h2>We are planning to add more useful functions in the future.</h2>
        <button onClick={() => updateToggle(2)} className="button">
          Use Critiqify
        </button>
        <h1>&nbsp;</h1>
        <h1>HOW TO USE CRITIQIFY</h1>
        <h2>
          Simply click the button above to go to the recording page.
          <br></br>Choose to record with video and audio, or audio only. 
          Then click "Get Camera" or "Get Microphone" to allow permissions, and start recording whenever you're ready. 
          Ask AI for tips whenever you like. After recording a video, use the text box to critique yourself.
          <br></br>Have fun!
        </h2>
      </div>
      <div className={toggle === 2 ? "show-content" : "content"}>
        <h2>Record a Presentation!</h2>
        <div className="button-flex">
          <button onClick={toggleRecordOption("video")}>Record Video</button>
          <button onClick={toggleRecordOption("audio")}>Record Audio</button>
        </div>
        <div>
          {recordOption === "video" ? <VideoRecorder /> : <AudioRecorder />}
        </div>
        <Gemini />
      </div>
      <div className={toggle === 3 ? "show-content" : "content"}>
        <h2>Alex Park : park.ale@northeastern.edu</h2>
        <a href="https://www.linkedin.com/in/alex-park-/">
          <img src="alex.jpeg" alt="" width="128" height="160"/>
        </a>
        <h2>Aiden Rim : rim.a@northeastern.edu</h2>
        <a href="https://www.youtube.com/watch?v=DINnS09LZww">
          <img
            src="aiden.jpg"
            alt="arim"
            width="128"
            height="160"
          ></img>
        </a>
        <h2>Bryan Li : li.brya@northeastern.edu</h2>
        <a href="https://www.linkedin.com/in/bryanli27/">
          <img
            src="bryan.jpeg"
            alt="bryali"
            width="128"
            height="160"
          ></img>
        </a>
        <h2>Colin Chu : chu.col@northeastern.edu</h2>
        <a href="https://www.crunchyroll.com/series/GY8VEQ95Y/darling-in-the-franxx">
          <img
            src="colin.jpg"
            alt="colchu"
            width="128"
            height="160"
          ></img>
        </a>
      </div>
    </>
  );
};

export default App;
