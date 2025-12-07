import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RedirectingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/"); // ✅ redirect alla home
    }, 2000); // aspetta 2 secondi prima di reindirizzare

    return () => clearTimeout(timer); // pulisce il timer se il componente si smonta
  }, [navigate]);

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      height: "100vh", 
      fontFamily: "Arial, sans-serif" 
    }}>
      <h2 style={{ fontSize: "28px", marginBottom: "10px" }}>Login effettuato!</h2>
      <p style={{ fontSize: "18px", color: "#555" }}>
        Ti stiamo reindirizzando alla dashboard...
      </p>
    </div>
  );
};

export default RedirectingPage;
