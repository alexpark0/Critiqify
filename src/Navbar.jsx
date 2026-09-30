import "./Navbar.css";
import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }) =>
  isActive ? "nav-link is-active" : "nav-link";

const Navbar = () => {
  return (
    <nav className="navbar" aria-label="Primary">
      <div className="navbar-left">
        <NavLink to="/" end className="navbar-brand">
          Critiqify
        </NavLink>
      </div>
      <div className="navbar-right">
        <NavLink to="/record" className={linkClass}>
          Record
        </NavLink>
        <NavLink to="/logs" className={linkClass}>
          Logs
        </NavLink>
        <NavLink to="/credits" className={linkClass}>
          Credits
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;
