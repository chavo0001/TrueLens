import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const ConfirmEmailPage = () => {
  const [message, setMessage] = useState('');
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    if (token) {
      // Invia una richiesta al backend per confermare l'email
      axios
        .post('http://localhost:5001/api/confirm-email', { token })
        .then(response => {
          setMessage('Email confermata con successo!');
        })
        .catch(error => {
          setMessage('Errore nella conferma dell\'email. Riprova più tardi.');
        });
    } else {
      setMessage('Token mancante. Riprova più tardi.');
    }
  }, [location]);

  return (
    <div>
      <h2>Conferma dell'Email</h2>
      <p>{message}</p>
    </div>
  );
};

export default ConfirmEmailPage;
