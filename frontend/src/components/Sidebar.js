import React, { useContext, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { FaCompass, FaUserCircle, FaStar, FaSignInAlt } from "react-icons/fa";
import { UserContext } from "../data/UserContext";
import { apiFetch } from "../api/apiFetch";
import { toast } from "react-toastify";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useContext(UserContext);
  const isLogged = !!user;

  // 🔔 follower notifications UI
  const [followNotifCount, setFollowNotifCount] = useState(0);
  const [pulseMyProfile, setPulseMyProfile] = useState(false);

  // baseline per polling: NON deve ripartire da 0 a ogni login
  const lastFollowEventIdRef = useRef(0);
  const notificationsReadyRef = useRef(false); // evita polling prima dell’inizializzazione

  const linkClass = ({ isActive }) => `sidebar-item${isActive ? " active" : ""}`;

  const goExplore = (e) => {
    e.preventDefault();
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }
    if (isOpen) toggleSidebar();
  };

  const goTo = (path) => (e) => {
    e.preventDefault();
    navigate(path);
    if (isOpen) toggleSidebar();
  };

  // ✅ quando clicchi My profile: segna come visti + reset badge/pulse
  const goMyProfile = async (e) => {
    e.preventDefault();

    if (isLogged) {
      try {
        await apiFetch("/api/notifications/mark-followers-seen", { method: "POST" });
      } catch (_) {}

      setFollowNotifCount(0);
      setPulseMyProfile(false);
    }

    navigate("/me");
    if (isOpen) toggleSidebar();
  };

  // 1) init notifiche al login: badge offline + baseline afterId (NO toast)
  useEffect(() => {
    if (!isLogged) {
      setFollowNotifCount(0);
      setPulseMyProfile(false);
      lastFollowEventIdRef.current = 0;
      notificationsReadyRef.current = false;
      return;
    }

    (async () => {
      try {
        // A) offline badge/pulse (NO toast)
        const res1 = await apiFetch("/api/notifications/unseen-followers");
        if (res1.ok) {
          const data1 = await res1.json();
          const count = Number(data1.count || 0);
          if (count > 0) {
            setFollowNotifCount(count);
            setPulseMyProfile(true);
          }
        }

        // B) baseline: non tostare roba vecchia
        const res2 = await apiFetch("/api/notifications/latest-follow-event-id");
        if (res2.ok) {
          const data2 = await res2.json();
          lastFollowEventIdRef.current = Number(data2.latestId || 0);
        } else {
          lastFollowEventIdRef.current = 0;
        }

        // ora il polling può partire
        notificationsReadyRef.current = true;
      } catch (err) {
        console.error("init notifications error:", err);
        // anche se fallisce, evitiamo loop strani
        lastFollowEventIdRef.current = 0;
        notificationsReadyRef.current = true;
      }
    })();
  }, [isLogged]);

  // 2) polling eventi live (toast SOLO nuovi)
  useEffect(() => {
    if (!isLogged) return;

    const interval = setInterval(async () => {
      try {
        if (!notificationsReadyRef.current) return;

        const afterId = lastFollowEventIdRef.current || 0;
        const res = await apiFetch(`/api/notifications/follow-events?afterId=${afterId}`);
        if (!res.ok) return;

        const data = await res.json();
        const events = data.events || [];

        if (events.length > 0) {
          // toast live SOLO per eventi nuovi
          for (const ev of events) {
            if (ev?.username) toast.info(`@${ev.username} ti ha seguito`);
          }

          setFollowNotifCount((c) => c + events.length);
          setPulseMyProfile(true);

          lastFollowEventIdRef.current = Number(data.latestId || afterId);
        }
      } catch (err) {
        // opzionale: console.error("poll error:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isLogged]);

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

          {isLogged ? (
            <>
              {/* MY PROFILE con badge + pulse */}
              <NavLink
                to="/me"
                className={({ isActive }) =>
                  `sidebar-item${isActive ? " active" : ""}${pulseMyProfile ? " myprofile-pulse" : ""}`
                }
                onClick={goMyProfile}
              >
                <FaUserCircle className="sidebar-icon" />
                <span>My profile</span>

                {followNotifCount > 0 && (
                  <span className="sidebar-badge">{followNotifCount}</span>
                )}
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