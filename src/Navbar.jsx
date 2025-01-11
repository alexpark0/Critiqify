import React from "react";
import "./Navbar.css";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-title">
          <h1 className="navbar-title">CRITIQIFY</h1>
        </Link>
      </div>
      <div className="navbar-right">
        <Link to="/record" className="nav-link">
          Record
        </Link>
        <Link to="/credits" className="nav-link">
          Credits
        </Link>
        <Link to="/logs" className="nav-link">
          Logs
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
