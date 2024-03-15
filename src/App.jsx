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
    const [val, setVal] = useState("Enter Critiques Here")
    const click = () => {
        alert(val)
    }
    const change = event => {
        setVal(event.target.value)
    }
    return (
        <>
        <div>
        <img src = "IMG_2921.jpg" alt="alex park" width="128" height="64"></img>
        </div>
        <div className = "alex-park-homescreen">
            <button className="button-left">Home</button>
            <button className="button-middle">About</button>
            <button className="button-middle">Services</button>
            <button className="button-right">Contact</button>
        </div>
        <div>
            <h1>Alex Park App</h1>
            <h2>Record yourself doing a presentation!</h2>
            <div className="button-flex">
                <button onClick={toggleRecordOption("video")}>
                    Record Video
                </button>
                <button onClick={toggleRecordOption("audio")}>
                    Record Audio
                </button>
            </div>
            <div>
                {recordOption === "video" ? <VideoRecorder /> : <AudioRecorder />}
            </div>
            <div className = "textbox">
                <form>
                    <label>
                        Critique: 
                        <input type="text" name="lastCritique" />
                    </label>
                    <input type="submit" value="Enter" />
                </form>
            </div>
        </div></>
    );
};

export default App;
