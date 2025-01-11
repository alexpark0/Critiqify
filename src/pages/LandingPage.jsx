import "./LandingPage.css";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { IoIosArrowDown } from "react-icons/io";

const LandingPage = () => {
  
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
      const timeout = setTimeout(() => {
          setIsVisible(true);
      }, 100);
      return () => clearTimeout(timeout);
  }, []);

  const style = {
    backgroundImage: `url(interviewstock.jpg)`,
    height: "100vh",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat"
  }

  return (
    <>
    <div style={style}>
      <div className="main-block">
        <div className={isVisible ? "fade-in" : ""}>
          <h1 className="blank"> . </h1>
          <h1>AI-Powered<br></br>Interview Prep</h1>
          <h2>Ace your interviews with Critiqify.</h2>
          <br></br>
          <Link to="/record" className="button">
            Start Recording
          </Link>
        </div>
        <div className="arrow">
          <IoIosArrowDown></IoIosArrowDown>
        </div>
      </div>
      <div className="tutorial">
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
      </div>
    </div>
    </>
  );
};

export default LandingPage;
