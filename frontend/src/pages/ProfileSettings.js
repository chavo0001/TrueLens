import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../data/UserContext";
import "../styles/ProfileSettings.css";
import PasswordPopup from "./PasswordPopUp";

const ProfileSettings = () => {
  const { user, setUser, refreshUser } = useContext(UserContext);

  const [username, setUsername] = useState(user?.username || "");
  const [usernameError, setUsernameError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar ?? "/default-avatar.jpg");

  const [paymentMethod, setPaymentMethod] = useState("Visa **** 1234"); // placeholder
  const [message, setMessage] = useState("");

  const [pwPopupOpen, setPwPopupOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("Utente non autenticato");
      return;
    }

    fetch("/api/user/settings", {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setUsername(data.username || "");
        setAvatarPreview(data.avatar ?? "/default-avatar.jpg");
        setPaymentMethod(data.payment_method || "Nessun metodo impostato");
      })
      .catch(() => setMessage("Errore nel caricamento dei dati utente."));
  }, []);

  const checkUsernameAvailability = async () => {
    if (!username.trim() || username === user?.username) return setUsernameError("");
    try {
      const r = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);
      const { exists } = await r.json();
      setUsernameError(exists ? "Nome utente già in uso." : "");
    } catch {
      setUsernameError("Errore controllo nome.");
    }
  };

  const saveUsername = async () => {
    if (usernameError || !username.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("Utente non autenticato");
      return;
    }
    const fd = new FormData();
    fd.append("username", username.trim());

    try {
      const res = await fetch("/api/update-profile", {
        method: "POST",
        body: fd,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setUser(updated);
      await refreshUser();
      setMessage("Nome aggiornato!");
    } catch {
      setMessage("Errore aggiornamento nome.");
    }
  };

  const handleAvatarChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setAvatarPreview(URL.createObjectURL(file));

  const token = localStorage.getItem("token");
  if (!token) {
    setMessage("Utente non autenticato");
    return;
  }

  const fd = new FormData();
  fd.append("avatar", file);

  fetch("/api/update-profile", {
    method: "POST",
    body: fd,
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  })
    .then(async (r) => {
      if (!r.ok) throw new Error();
      return r.json();
    })
    .then((updated) => {
      const fullUrl = updated.avatar
        ? `http://localhost:5001${updated.avatar}`
        : "/default-avatar.jpg";
      setAvatarPreview(fullUrl);

      // aggiorna avatar anche globalmente
      setUser(prev => ({
        ...prev,
        avatar: fullUrl,
      }));

      refreshUser();
      setMessage("Immagine aggiornata!");
    })
    .catch(() => setMessage("Errore aggiornamento immagine."));
};

  return (
    <div className="profile-settings-container">
      <div className="profile-header">
        <div className="avatar-wrapper">
          <img src={avatarPreview} alt="avatar" />
          <label htmlFor="avatar-up">✏️</label>
          <input id="avatar-up" type="file" accept="image/*" onChange={handleAvatarChange} />
        </div>

        <div className="header-name">
          <label htmlFor="username">Nome utente</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={checkUsernameAvailability}
          />
          {usernameError && <small className="error-msg">{usernameError}</small>}
          <button className="btn-primary" onClick={saveUsername} disabled={!!usernameError}>
            Salva
          </button>
        </div>
      </div>

      <div className="card">
        <p className="card-title">Metodo di pagamento</p>
        <div className="payment-box">
          <span>{paymentMethod}</span>
          <button className="btn-secondary" onClick={() => alert("TODO cambio pagamento")}>
            Cambia metodo
          </button>
        </div>
      </div>

      <div className="card">
        <p className="card-title">Password</p>
        <button className="btn-secondary" onClick={() => setPwPopupOpen(true)}>
          Modifica password
        </button>
      </div>

      {message && <p className="success-msg">{message}</p>}

      {pwPopupOpen && <PasswordPopup userEmail={user.email} onClose={() => setPwPopupOpen(false)} />}
    </div>
  );
};

export default ProfileSettings;
