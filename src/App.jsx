import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import RecordPage from "./pages/RecordPage";
import CreditsPage from "./pages/CreditsPage";
import Navbar from "./Navbar";
import Logs from "./pages/Videos";

const App = () => {
  return (
    <Router>
      <Navbar></Navbar>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/credits" element={<CreditsPage />} />
        <Route path="/logs" element={<Logs />} />
      </Routes>
    </Router>
  );
};

export default App;
