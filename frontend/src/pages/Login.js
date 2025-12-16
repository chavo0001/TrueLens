import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/UserRegistration.css";
import { UserContext } from "../data/UserContext";
import { toast } from "react-toastify";

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);

  const [formData, setFormData] = useState({
    identifier: "", // <-- email O username
    password: "",
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.identifier || !formData.password) {
      setError("Tutti i campi sono obbligatori.");
      return;
    }

    setIsLoading(true);
    setError("");

    console.log("LOGIN payload:", {
  identifier: formData.identifier,
  password: formData.password ? "***" : "",
});

    try {
      const response = await fetch("http://localhost:5001/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          identifier: formData.identifier.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.user) {
        const avatarUrl =
          data.user.avatar && data.user.avatar !== "null"
            ? `http://localhost:5001${data.user.avatar}`
            : "/default-avatar.jpg";

        setUser({ ...data.user, avatar: avatarUrl });

        toast.success(`Bentornato${data.user.username ? `, ${data.user.username}` : ""}!`);
        navigate("/");
      } else {
        setError(data.error || data.message || "Credenziali non valide.");
      }
    } catch (err) {
      console.error("Errore di login:", err);
      setError("Errore di connessione al server. Riprova.");
    } finally {
      setIsLoading(false);
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
          <h2>Login</h2>
          {error && <p className="error">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "15px" }}>
              <label htmlFor="identifier">Email o username</label>
              <input
                type="text"
                id="identifier"
                name="identifier"
                value={formData.identifier}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                placeholder="email@example.com oppure matteo"
                autoComplete="username"
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
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Caricamento..." : "Accedi"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
