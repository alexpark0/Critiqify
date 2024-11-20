import "./LandingPage.css";

const LandingPage = () => {
  return (
    <>
    <div className="main-block">
      <div>
        <h1>AI-Powered Interview/Presentation Prep</h1>
        <div>Record and critique video presentations.</div>
      </div>
      <img src="pngwing.com.png" alt="" width="750" height="500" />
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
