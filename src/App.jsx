import "./App.css";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import RecordPage from "./pages/RecordPage";
import CreditsPage from "./pages/CreditsPage";
import Navbar from "./Navbar";

const App = () => {
  return (
    <Router>
      <Navbar></Navbar>
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
