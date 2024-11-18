import "./App.css";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import RecordPage from "./pages/RecordPage";
import CreditsPage from "./pages/CreditsPage";

const App = () => {
  return (
    <Router>
      <div className="alex-park-homescreen">
        {/* Navigation Buttons */}
        <Link to="/" className="button-left">About</Link>
        <h1>CRITIQIFY</h1>
        <Link to="/record" className="button-middle">Record</Link>
        <Link to="/credits" className="button-right">Credits</Link>
      </div>

      {/* Routes for Different Pages */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/credits" element={<CreditsPage />} />
      </Routes>
    </Router>
  );
};

export default App;
