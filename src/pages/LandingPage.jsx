import "./LandingPage.css";
import { Link } from "react-router-dom";
import { IoIosArrowDown } from "react-icons/io";

const steps = [
  {
    title: "Get a sample question",
    body: "Generate a practice prompt on the record page, or bring one you already have.",
  },
  {
    title: "Record your answer",
    body: "Turn on the camera and microphone, then capture your response.",
  },
  {
    title: "Get your graded critique",
    body: "See cadence, eye contact, filler words, and intonation, with notes on specific moments.",
  },
  {
    title: "Chat with the AI",
    body: "Ask follow-ups about this recording and dig deeper into the feedback.",
  },
];

const LandingPage = () => {
  const scrollToHowTo = () => {
    document.getElementById("how-to")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-overlay" aria-hidden="true" />
        <div className="hero-content fade-in">
          <h1 id="hero-title">
            AI-Powered
            <br />
            Interview Prep
          </h1>
          <p className="lede">Ace your interviews with Critiqify.</p>
          <Link to="/record" className="button">
            Start Recording
          </Link>
        </div>
        <button type="button" className="scroll-cue" onClick={scrollToHowTo}>
          <IoIosArrowDown aria-hidden="true" />
          <span className="sr-only">Scroll to how to use</span>
        </button>
      </section>
      <section className="how-to" id="how-to" aria-labelledby="how-to-title">
        <div className="how-to-bg" aria-hidden="true" />
        <div className="how-to-overlay" aria-hidden="true" />
        <div className="how-to-inner">
          <h2 id="how-to-title">How to use</h2>
          <p className="how-to-lede">
            Four steps from a practice question to a conversation about your
            answer.
          </p>
          <ol className="how-steps">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="how-step-index" aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
          <Link to="/record" className="button how-to-action">
            Start Recording
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
