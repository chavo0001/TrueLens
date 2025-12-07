const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'truesubs2025@gmail.com',
    pass: 'luccio99' // Usa una password di applicazione se hai l'autenticazione a due fattori
  }
});

module.exports = transporter;
