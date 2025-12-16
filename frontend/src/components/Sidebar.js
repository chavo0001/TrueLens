import React, { useContext } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { FaCompass, FaUserCircle, FaStar, FaSignInAlt } from "react-icons/fa";
import { UserContext } from "../data/UserContext"; // <-- se il path è diverso dimmelo

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Se non vuoi condizionare la sidebar allo stato login, dimmelo e tolgo queste 2 righe
  const { user } = useContext(UserContext);
  const isLogged = !!user;

  const linkClass = ({ isActive }) => `sidebar-item${isActive ? " active" : ""}`;

  const goExplore = (e) => {
    e.preventDefault();

    // Se siamo già in home, scrolla su. Altrimenti naviga.
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }

    // se sidebar è overlay (mobile), chiudi dopo click
    if (isOpen) toggleSidebar();
  };

  const goTo = (path) => (e) => {
    e.preventDefault();
    navigate(path);
    if (isOpen) toggleSidebar();
  };

  return (
    <>
      <div className={`sidebar ${!isOpen ? "closed" : ""}`}>
        <div className="logo">TrueLens</div>

        <nav className="sidebar-links">
          {/* EXPLORE */}
          <a href="/" className="sidebar-item" onClick={goExplore}>
            <FaCompass className="sidebar-icon" />
            <span>Explore</span>
          </a>

          {/* MY PROFILE + SAVED: solo se loggato */}
          {isLogged ? (
            <>
              <NavLink to="/me" className={linkClass} onClick={goTo("/me")}>
                <FaUserCircle className="sidebar-icon" />
                <span>My profile</span>
              </NavLink>

              <NavLink to="/saved" className={linkClass} onClick={goTo("/saved")}>
                <FaStar className="sidebar-icon" />
                <span>Saved</span>
              </NavLink>
            </>
          ) : (
            <NavLink to="/login" className={linkClass} onClick={goTo("/login")}>
              <FaSignInAlt className="sidebar-icon" />
              <span>Login</span>
            </NavLink>
          )}
        </nav>
      </div>

      {!isOpen ? (
        <div className="sidebar-lembo" onClick={toggleSidebar} />
      ) : (
        <button className="toggle-button" onClick={toggleSidebar}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
      )}
    </>
  );
};

export default Sidebar;
