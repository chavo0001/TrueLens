import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/UserRegistration.css"; // Assicurati che il percorso sia corretto

const UserRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "", // aggiunta per la conferma password
    username: "", // username invece di nome e cognome
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // stato per il loading

  // Blocca lo scroll della pagina
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.username || !formData.confirmPassword) {
      setError("Tutti i campi sono obbligatori.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Le password non corrispondono.");
      return;
    }

    setIsLoading(true); // Avvia il loading
    try {
      setError(""); // Reset degli errori

      const response = await fetch('http://localhost:5001/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          username: formData.username,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Registrazione avvenuta con successo! Controlla la tua email per la conferma.');
        navigate("/thankyou"); // Naviga alla pagina di ringraziamento
      } else {
        setError(data.message || "Errore durante la registrazione.");
      }
    } catch (err) {
      setError("Errore di connessione. Riprova.");
    } finally {
      setIsLoading(false); // Ferma il loading
    }
  };

  return (
    <div className="registration-container">
      <div className="left-side">
        <h1>TrueLens</h1>
        <p>Be yourself and people's gonna love it.</p>
      </div>
      <div className="right-side">
        <div className="content">
          <h2>Registrazione</h2>
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "15px" }}>
              <label htmlFor="username">Nome Utente</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                disabled={isLoading}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isLoading}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={isLoading}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label htmlFor="confirmPassword">Conferma Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                disabled={isLoading}
              />
            </div>
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Caricamento..." : "Registrati"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserRegistration;
