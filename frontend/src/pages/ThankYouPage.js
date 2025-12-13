import React from "react";
import { useNavigate } from "react-router-dom";
import '../styles/ThankYouPage.css'; 

const ThankYouPage = () => {
  const navigate = useNavigate();

  return (
    <div className="thankyou-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "600" }}>Grazie per esserti registrato!</h2>
      <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: "400", textAlign: "center" }}>
        La tua registrazione è stata completata con successo. Controlla la tua email per il link di conferma e accedi al tuo account.
      </p>
      <button 
        onClick={() => navigate("/login")}
        style={{
          padding: "12px 20px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontFamily: "'Poppins', sans-serif",
          fontWeight: "600"
        }}
      >
        Vai al Login
      </button>
    </div>
  );
};

export default ThankYouPage;
