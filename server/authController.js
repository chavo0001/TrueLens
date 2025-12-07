const nodemailer = require('nodemailer');
const User = require('../models/User'); // Modello dell'utente
const transporter = require('../utils/emailConfig'); // Configurazione dell'email

const registerUser = async (req, res) => {
  const { email, username, password } = req.body;
  try {
    // Creazione dell'utente nel database
    const newUser = new User({ email, username, password });
    await newUser.save();

    // Definizione dei dettagli dell'email
    const mailOptions = {
      from: 'TrueSubs <truesubs2025@gmail.com>',
      to: [email, 'truesubs2025@gmail.com'], // manda anche a te stesso
      subject: 'Conferma la tua registrazione su TrueSubs',
      html: `
        <h2>Benvenuto su TrueSubs, ${username}!</h2>
        <p>Grazie per esserti registrato alla nostra piattaforma.</p>
        <p>Per completare la registrazione, clicca sul pulsante qui sotto:</p>
        <p>
          <a href="http://tuo-sito.com/confirm-email?username=${username}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            Conferma Registrazione
          </a>
        </p>
        <p>Se non hai richiesto questa registrazione, puoi ignorare questa email.</p>
        <p style="margin-top: 40px;">— Il team di TrueSubs</p>
      `
    };


    // Invio dell'email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log('Errore invio email:', error);
      }
      console.log('Email inviata:', info.response);
    });

    res.status(200).json({ message: 'Registrazione completata con successo' });
  } catch (error) {
    console.error('Errore nella registrazione:', error);
    res.status(500).json({ error: 'Errore nella registrazione' });
  }
};

module.exports = { registerUser };
