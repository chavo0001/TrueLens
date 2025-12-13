import React from "react";
import { NavLink } from "react-router-dom";
import "../styles/Sidebar.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import {
  FaHome,
  FaMountain,      // Paesaggi
  FaUser,          // Ritratti
  FaHeart,         // Matrimoni
  FaCameraRetro,   // Street
  FaPaw            // Wildlife
} from "react-icons/fa";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const linkClass = ({ isActive }) => `sidebar-item${isActive ? " active" : ""}`;

  return (
    <>
      {/* SIDEBAR */}
      <div className={`sidebar ${!isOpen ? "closed" : ""}`}>
        <div className="logo">TrueLens</div>

        <nav className="sidebar-links">
          <NavLink to="/"            className={linkClass}>
            <FaHome className="sidebar-icon" />
            <span>Home</span>
          </NavLink>

          <NavLink to="/paesaggi"    className={linkClass}>
            <FaMountain className="sidebar-icon" />
            <span>Paesaggi</span>
          </NavLink>

          <NavLink to="/ritratti"    className={linkClass}>
            <FaUser className="sidebar-icon" />
            <span>Ritratti</span>
          </NavLink>

          <NavLink to="/matrimoni"   className={linkClass}>
            <FaHeart className="sidebar-icon" />
            <span>Matrimoni</span>
          </NavLink>

          <NavLink to="/street"      className={linkClass}>
            <FaCameraRetro className="sidebar-icon" />
            <span>Street Photography</span>
          </NavLink>

          <NavLink to="/wildlife"    className={linkClass}>
            <FaPaw className="sidebar-icon" />
            <span>Wildlife</span>
          </NavLink>
        </nav>
      </div>

      {/* Lembo quando la sidebar è chiusa */}
      {!isOpen ? (
        <div className="sidebar-lembo" onClick={toggleSidebar} />
      ) : (
        /* Bottone quando la sidebar è aperta */
        <button className="toggle-button" onClick={toggleSidebar}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
      )}
    </>
  );
};

export default Sidebar;
