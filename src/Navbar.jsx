import React from "react";
import "./Navbar.css";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="nav-button">
          Home
        </Link>
      </div>
      <div className="navbar-center">
        <h1 className="navbar-title">CRITIQIFY</h1>
      </div>
      <div className="navbar-right">
        <Link to="/record" className="nav-button">
          Record
        </Link>
        <Link to="/credits" className="nav-button">
          Credits
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
