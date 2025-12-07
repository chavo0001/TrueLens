import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [user, setUser] = useState(null); // Stato per tenere traccia dei dati dell'utente
  const [loading, setLoading] = useState(true); // Stato per gestire il caricamento
  const navigate = useNavigate(); // Hook per navigare programmaticamente

  useEffect(() => {
    // Funzione per recuperare i dati dell'utente
    const fetchUserData = async () => {
      try {
        // Fai una richiesta al tuo backend per ottenere i dati dell'utente
const response = await fetch("http://localhost:5001/api/user", {
       method: "GET",
       headers: {
         "Content-Type": "application/json",
   },
       credentials: "include" // deve stare qui, fuori da headers
});

        // Controlla se la risposta è corretta
        if (response.ok) {
          const data = await response.json();
          setUser(data); // Imposta i dati dell'utente nello stato
        } else {
          const errorMessage = await response.text(); // Recupera il messaggio di errore in formato testo
          throw new Error(`Errore nel recupero dei dati: ${errorMessage}`);
        }
      } catch (error) {
        console.error(error);
        navigate("/login"); // Se c'è un errore o non è autorizzato, fai il redirect al login
      } finally {
        setLoading(false); // Finisce il caricamento
      }
    };

    fetchUserData(); // Chiama la funzione quando il componente è montato
  }, [navigate]);

  // Se i dati dell'utente non sono ancora stati caricati
  if (loading) {
    return <div>Caricamento...</div>;
  }

  // Se non ci sono dati dell'utente
  if (!user) {
    return <div>Impossibile caricare i dati dell'utente.</div>;
  }

  return (
    <div className="dashboard">
      <h1>Benvenuto, {user.name}</h1> {/* Mostra il nome dell'utente */}
      <p>Email: {user.email}</p> {/* Mostra l'email dell'utente */}
      
      <div className="dashboard-actions">
        <button onClick={() => navigate("/user-registration")}>Modifica Profilo</button>
        <button onClick={() => navigate("/thankyou")}>Ringraziamento</button>
      </div>
    </div>
  );
};  

export default Dashboard;
