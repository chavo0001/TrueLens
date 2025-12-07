const { Pool } = require('pg');

const pool = new pool({ //creo connessione al db
  user: 'postgres',       // username
  host: 'localhost',     
  database: 'TrueLens',   // nome del database
  password: 'TrueSubs',  // password dell'utente
  port: 5432,             
});

// Connessione al database
pool.connect()
  .then(() => console.log('Connessione al database riuscita!'))
  .catch(err => console.error('Errore di connessione al database:', err.stack));

module.exports = pool; 
