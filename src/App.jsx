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
          {/* <img src={ require('./assets/alex.jpg') } alt=''/>  */}
        </a>
        <h2>Aiden Rim : rim.a@northeastern.edu</h2>
        <a href="https://www.youtube.com/watch?v=DINnS09LZww">
          <img
            src="https://attachments.office.net/owa/Alexander.Park%40revvity.com/service.svc/s/GetAttachmentThumbnail?id=AAMkAGQxZjBkMDYzLTBhYWEtNDI4ZS04M2Q2LTNhODA2NzExMWYwZABGAAAAAAD822%2BIcFQZSqz%2BqxSX9pn%2BBwC2Gwc7EmQOS6ogJ%2B4YmQtuAAAAAAEMAAC2Gwc7EmQOS6ogJ%2B4YmQtuAAAMpsTsAAABEgAQAEeGvEsE8npHlSypjU9UGus%3D&thumbnailType=2&token=eyJhbGciOiJSUzI1NiIsImtpZCI6IkU1RDJGMEY4REE5M0I2NzA5QzQzQTlFOEE2MTQzQzAzRDYyRjlBODAiLCJ0eXAiOiJKV1QiLCJ4NXQiOiI1ZEx3LU5xVHRuQ2NRNm5vcGhROEE5WXZtb0EifQ.eyJvcmlnaW4iOiJodHRwczovL291dGxvb2sub2ZmaWNlLmNvbSIsInVjIjoiNTk3YWEwN2IyYWQxNDk0ZmJhZTBmOTMyYjE5MjQ1YTIiLCJzaWduaW5fc3RhdGUiOlsiZHZjX21uZ2QiLCJkdmNfY21wIl0sInZlciI6IkV4Y2hhbmdlLkNhbGxiYWNrLlYxIiwiYXBwY3R4c2VuZGVyIjoiT3dhRG93bmxvYWRANjZhOTJkMGYtOGNhOC00MDNjLTg0ZTYtNTUwM2M1NjQzOTk0IiwiaXNzcmluZyI6IldXIiwiYXBwY3R4Ijoie1wibXNleGNocHJvdFwiOlwib3dhXCIsXCJwdWlkXCI6XCIxMTUzODAxMTI4OTExNDY0NzEwXCIsXCJzY29wZVwiOlwiT3dhRG93bmxvYWRcIixcIm9pZFwiOlwiYWYwYTY2OGItMDQzYS00OGNmLWJiNWEtMTJjN2QzZmIyYTUxXCIsXCJwcmltYXJ5c2lkXCI6XCJTLTEtNS0yMS00MDM3NDE0MzcwLTI2NzQ5MTEwMDgtMTMzNTIwMjA5MC0zMDkxMTg4NlwifSIsIm5iZiI6MTcxNjk5NjA2OSwiZXhwIjoxNzE2OTk2MzY5LCJpc3MiOiIwMDAwMDAwMi0wMDAwLTBmZjEtY2UwMC0wMDAwMDAwMDAwMDBANjZhOTJkMGYtOGNhOC00MDNjLTg0ZTYtNTUwM2M1NjQzOTk0IiwiYXVkIjoiMDAwMDAwMDItMDAwMC0wZmYxLWNlMDAtMDAwMDAwMDAwMDAwL2F0dGFjaG1lbnRzLm9mZmljZS5uZXRANjZhOTJkMGYtOGNhOC00MDNjLTg0ZTYtNTUwM2M1NjQzOTk0IiwiaGFwcCI6Im93YSJ9.ANYMDojhUwxRorCZwTXhuP0NWT8vpptzLmurY6MlD-_biJcQmW-qSjhFN4q5ocqaDDlEWp1uDBzI7t_S5cylOEF2lBUGm4eWxAaFoR6Aolg5P4G7Rvvz_9547fZACCGYgimmTXuMCfVjFZuAijoeuITWjWi9AfKFfvtUXRk2j2UlOrdCHf0DEjtS6yNMU2nnlTF7dYiSO5XVGh2xdvjfSqKwLNpJ3LrpzQ3_ptmtvJ2BCdm3loKP_zZ1vOLpxK8nT5mdKiPyd4_KGZmr75mdKBjuOsm59orfx6gRdSGzUdu4IuwUbfcoya80zbaBiHKyR4EAI9hZND69tqLnqrNcwQ&X-OWA-CANARY=X-OWA-CANARY_cookie_is_null_or_empty&owa=outlook.office.com&scriptVer=20240517003.15&clientId=409E1F7319B34CEE99DBEE9207721546&animation=true&persistenceId=652016d5-72ad-4d0e-b2b8-c8d8818f593c"
            alt="arim"
            width="128"
            height="140"
          ></img>
        </a>
        <h2>Bryan Li : li.brya@northeastern.edu</h2>
        <a href="https://www.linkedin.com/in/bryanli27/">
          <img
            src="https://media.discordapp.net/attachments/799331016489042020/1224047746248347668/Screenshot_2024-03-31_at_1.20.47_PM.png?ex=661c124c&is=66099d4c&hm=e25acc8ff599b3f886ac8be94ef24177a8f6fe16de2806f663c30cdf19135cd6&=&format=webp&quality=lossless&width=912&height=1174"
            alt="bryali"
            width="128"
            height="160"
          ></img>
        </a>
        <h2>Colin Chu : chu.col@northeastern.edu</h2>
        <a href="https://www.crunchyroll.com/series/GY8VEQ95Y/darling-in-the-franxx">
          <img
            src="https://media.discordapp.net/attachments/799331016489042020/1224047746915500032/Screenshot_2024-03-31_at_1.25.17_PM.png?ex=661c124c&is=66099d4c&hm=f9b593ca40740949a1d2b4d7e73eff9865b3cb9ff2731cdbad29b841aec31000&=&format=webp&quality=lossless&width=912&height=1174"
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
