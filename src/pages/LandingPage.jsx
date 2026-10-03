import "./LandingPage.css";
import { Link } from "react-router-dom";
import { IoIosArrowDown } from "react-icons/io";
import CreditsPage from "./CreditsPage";

const LandingPage = () => {
  const scrollToCredits = () => {
    document.getElementById("credits")?.scrollIntoView({ behavior: "smooth" });
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
        <button type="button" className="scroll-cue" onClick={scrollToCredits}>
          <IoIosArrowDown aria-hidden="true" />
          <span className="sr-only">Scroll to credits</span>
        </button>
      </section>
      <CreditsPage />
    </div>
  );
};

export default LandingPage;
