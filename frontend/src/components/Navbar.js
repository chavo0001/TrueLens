// src/components/Navbar.js
import React, { useContext, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserContext } from "../data/UserContext";
import { FaUserCircle } from "react-icons/fa";
import "../styles/Navbar.css";

const Navbar = ({ isSidebarOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = ["/login", "/user-registration"].includes(location.pathname);

  const { user, logout } = useContext(UserContext);

  const [profileOpen, setProfileOpen] = React.useState(false);
  const dropdownRef = useRef(null);

  // click fuori per chiudere
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goMyProfile = () => {
    setProfileOpen(false);
    navigate("/me"); // route personale (MyProfile.js)
  };

  const doLogout = () => {
    setProfileOpen(false);
    logout();
  };

  return (
    <nav
      className={`navbar ${isAuthPage ? "auth-navbar" : ""} ${
        isSidebarOpen ? "sidebar-open" : ""
      }`}
    >
      <div className="navbar-inner">
        {!isAuthPage && (
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            &#9776;
          </button>
        )}

        <Link to="/" className={`logo-link ${isAuthPage ? "logo-left" : ""}`}>
          TrueLens
        </Link>

        <div className="links">
          {!user ? (
            <>
            
              <Link to="/login" className="login-link">
                Login
              </Link>
              <Link to="/user-registration" className="register-link">
                Registration
              </Link>
            </>
          ) : (
            <>
              

              <div className="profile-dropdown-wrapper" ref={dropdownRef}>
                <div
                  className="profile-dropdown"
                  onClick={() => setProfileOpen((o) => !o)}
                  role="button"
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                >
                  <img
                    src={
                      user.avatar && user.avatar !== "null"
                        ? user.avatar
                        : "/default-avatar.jpg"
                    }
                    alt="Profilo"
                  />

                  <span className="profile-name">
                    {user.username || "Utente"} <FaUserCircle />
                  </span>
                </div>

                {profileOpen && (
                  <div className="profile-dropdown-content open">
                    <button className="dropdown-item" onClick={goMyProfile}>
                      Il mio profilo
                    </button>

                    <hr />

                    <button className="dropdown-item dropdown-logout" onClick={doLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
