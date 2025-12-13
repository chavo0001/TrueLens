// src/components/Navbar.js
import React, { useContext, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserContext } from "../data/UserContext";
import { FaUserCircle } from "react-icons/fa";
import "../styles/Navbar.css";

const Navbar = ({ isSidebarOpen, toggleSidebar }) => {
  const location     = useLocation();
  const isAuthPage   = ["/login", "/user-registration", "/creator-registration"].includes(location.pathname);
  const { user, logout, setUser } = useContext(UserContext);

  const [profileOpen, setProfileOpen] = React.useState(false);
  const dropdownRef   = useRef(null);

  /* --- click fuori per chiudere --- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* --- upload avatar direttamente dalla navbar --- */
  const handleImageChange = (e) => {
    console.log(localStorage.getItem("token"));
    const token = localStorage.getItem("token");
    const file = e.target.files?.[0];
    if (!file) return;

    // anteprima immediata
    const preview = URL.createObjectURL(file);
    setUser((prev) => ({ ...prev, avatar: preview }));

    // upload e persistenza
    const fd = new FormData();
    fd.append("avatar", file);

    fetch("http://localhost:5001/api/update-profile", {
     method: "POST",
     body: fd,
     credentials: "include",  // << importante per mandare i cookie di sessione
  headers: {
     Authorization: `Bearer ${token}`,  // se usi token, altrimenti puoi rimuovere
     // NON mettere 'Content-Type' qui, lascia che il browser lo imposti
  },
})
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((updated) => {
        // avatar restituito dal server (es.  /uploads/12345.png)
        const fullUrl = updated.avatar
          ? `http://localhost:5001${updated.avatar}`
          : "/default-avatar.jpg";
        setUser((prev) => ({ ...prev, avatar: fullUrl }));
      })
      .catch(() => alert("Errore nel salvataggio dell’immagine"));
  };

  /* ------------- render -------------- */
  return (
    <nav className={`navbar ${isAuthPage ? "auth-navbar" : ""} ${isSidebarOpen ? "sidebar-open" : ""}`}>
      <div className="navbar-inner">
        {!isAuthPage && (
          <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
            &#9776;
          </button>
        )}

        <Link to="/" className={`logo-link ${isAuthPage ? "logo-left" : ""}`}>TrueLens</Link>

        <div className="links">
          {!user ? (
            <>
              <Link to="/"              className="nav-link">Home</Link>
              <Link to="/login"         className="login-link">Login</Link>
              <Link to="/user-registration" className="register-link">Registration</Link>
            </>
          ) : (
            <>
              <Link to="/" className="nav-link">Home</Link>

              <div className="profile-dropdown-wrapper" ref={dropdownRef}>
                <div
                  className="profile-dropdown"
                  onClick={() =>  setProfileOpen((o) => !o)}
                  role="button"
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                >
                  <img
                    src={user.avatar && user.avatar !== "null" ? user.avatar : "/default-avatar.jpg"}
                    alt="Profilo"
                    style={{ width: 32, height: 32, borderRadius: "50%" }}
                  />

                  <span className="profile-name">
                    {user.username || "Utente"} <FaUserCircle />
                  </span>
                </div>

                {profileOpen && (
                  <div className="profile-dropdown-content">
                  

                    <hr />
                    <button onClick={logout}>Logout</button>
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
