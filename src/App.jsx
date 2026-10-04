import "./App.css";
import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Link,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import RecordPage from "./pages/RecordPage";
import Navbar from "./Navbar";
import Logs from "./pages/Videos";

const titles = {
  "/": "Critiqify",
  "/record": "Record · Critiqify",
  "/logs": "Logs · Critiqify",
};

const DocumentTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titles[pathname] ?? "Page not found · Critiqify";
  }, [pathname]);

  return null;
};

const NotFound = () => {
  return (
    <div className="page-message">
      <h1>Page not found</h1>
      <p>That link does not match a page in Critiqify.</p>
      <Link to="/" className="button">
        Back home
      </Link>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <DocumentTitle />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/record" element={<RecordPage />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </Router>
  );
};

export default App;
