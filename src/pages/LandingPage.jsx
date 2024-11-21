import "./LandingPage.css";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
      const timeout = setTimeout(() => {
          setIsVisible(true);
      }, 100);
      return () => clearTimeout(timeout);
  }, []);

  return (
    <>
    <div className="main-block">
      <div className={isVisible ? "fade-in" : ""}>
        <h1>AI-Powered<br></br>Interview Prep</h1>
        <div>Prepare for interviews with Critiqify.</div>
        <br></br>
        <Link to="/record" className="button">
          Start Recording
        </Link>
      </div>
      <img src="pngwing.com.png" alt="" width="600" height="500" />
    </div>
      <h1>&nbsp;</h1>
      <h1>HOW TO USE CRITIQIFY</h1>
      <h2>
        Simply click the button above to go to the recording page.
        <br></br>
        Choose to record with video and audio, or audio only. Then click "Get
        Camera" or "Get Microphone" to allow permissions, and start recording
        whenever you're ready. Ask AI for tips whenever you like. After
        recording a video, use the text box to critique yourself.
        <br></br>
        Have fun!
      </h2>
    </>
  );
};

export default LandingPage;
