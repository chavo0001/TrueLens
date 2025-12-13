import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/CreatorRegistration.css';

const CreatorRegistration = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    descrizione: "",
    immagini: [] // file immagine
  });

  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (registrationComplete) {
      const timeout = setTimeout(() => {
        navigate("/creator/dashboard");
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [registrationComplete, navigate]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  const checkUsernameAvailability = (username) => {
    // TODO: chiamata reale al backend per disponibilità username
    return username === "admin"; // demo username non disponibile
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "username") setUsernameError("");
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + formData.immagini.length > 5) {
      setError("Puoi caricare fino a 5 immagini.");
      return;
    }
    setFormData(prev => ({ ...prev, immagini: [...prev.immagini, ...files] }));
  };

  const handleImageRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      immagini: prev.immagini.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password, confirmPassword, username, descrizione, immagini } = formData;

    if (!email || !password || !confirmPassword || !username || !descrizione) {
      setError("Tutti i campi sono obbligatori.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Le password non corrispondono.");
      return;
    }
    if (checkUsernameAvailability(username)) {
      setUsernameError("Nome utente già in uso");
      return;
    }

    try {
      setError("");
      const formToSend = new FormData();
      formToSend.append("email", email);
      formToSend.append("password", password);
      formToSend.append("username", username);
      formToSend.append("descrizione", descrizione);
    

      immagini.forEach(file => formToSend.append("immagini", file));

      const response = await fetch("http://localhost:5001/api/creator/register", {
        method: "POST",
        body: formToSend
      });

      const data = await response.json();

      if (response.ok) {
        setRegistrationComplete(true);
      } else {
        setError(data.message || "Errore durante la registrazione.");
      }
    } catch {
      setError("Errore durante la registrazione. Riprova.");
    }
  };

  if (registrationComplete) {
    return (
      <div className="registration-complete">
        <h1>Sei dei nostri, {formData.username}!</h1>
        <p>Buona fortuna! 😉</p>
      </div>
    );
  }

  return (
    <div className="creator-registration-container">
      <form onSubmit={handleSubmit} className="creator-registration-form">

        <h2 className="title">Registrazione Creator</h2>

        {(error || usernameError) && (
          <div className="error-message">{error || usernameError}</div>
        )}

        {/* Griglia immagini stile Tinder */}
        <div className="image-grid">
          {formData.immagini.length < 5 && (
            <label htmlFor="image-upload" className="image-card add-image-card">
              <span>+</span>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </label>
          )}

          {formData.immagini.map((file, idx) => (
            <div key={idx} className="image-card">
              <img src={URL.createObjectURL(file)} alt={`preview-${idx}`} />
              <button
                type="button"
                className="remove-image-btn"
                onClick={() => handleImageRemove(idx)}
                aria-label="Rimuovi immagine"
              >
                ×
              </button>
            </div>
          ))}

          {/* Fino a 5 card in totale, vuote se necessario */}
          {[...Array(5 - formData.immagini.length)].map((_, idx) => (
            <div key={"empty-" + idx} className="image-card empty-image-card"></div>
          ))}
        </div>

        {/* Campi input */}
        <div className="input-group">
          <label htmlFor="username">Nome Utente</label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleInputChange}
            required
            maxLength={30}
            autoComplete="username"
          />
        </div>

        <div className="input-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            autoComplete="email"
          />
        </div>

        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="input-group">
          <label htmlFor="confirmPassword">Ripeti Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            autoComplete="new-password"
          />
        </div>


        <div className="input-group full-width">
          <label htmlFor="descrizione">Descrizione Profilo</label>
          <textarea
            id="descrizione"
            name="descrizione"
            rows="6"
            value={formData.descrizione}
            onChange={handleInputChange}
            required
            placeholder="Raccontaci di te e dei tuoi contenuti..."
          />
        </div>

        <button type="submit" className="submit-button">
          Completa Registrazione Creator
        </button>
      </form>
    </div>
  );
};

export default CreatorRegistration;
