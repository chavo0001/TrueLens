const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '.env'), // usa il .env nella cartella "server"
});

require('events').EventEmitter.defaultMaxListeners = 20;

const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // Aggiunto per generare il token univoco
const multer = require("multer");
const bodyParser = require('body-parser');
const dns = require('dns');
dns.setServers(['8.8.8.8']);

const app = express();
const port = 5001;

console.log('JWT_SECRET è:', process.env.JWT_SECRET);
console.log('DB_PASSWORD è:', process.env.DB_PASSWORD ? '***' : 'undefined');
console.log('EMAIL_USER è:', JSON.stringify(process.env.EMAIL_USER));
console.log('EMAIL_PASS definita?:', !!process.env.EMAIL_PASS);

function authenticateToken(req, res, next) {       
  const authHeader = req.headers["authorization"];   // "Bearer token"
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // qui setto req.user.user_id
    next();
  });
}


app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(morgan('combined'));  // Formato più dettagliato e standard 
app.use(bodyParser.json());  

app.use(cors({
  origin: 'http://localhost:3000',  // frontend
  credentials: true                 // Permette le sessioni
}));


const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'TrueLens',
  password: 'TrueSubs',
  port: 5432,
});

pool.connect()
  .then(() => console.log('Connesso al database PostgreSQL!'))
  .catch(err => console.error('Errore di connessione:', err.stack));

// Middlewares
app.use(bodyParser.json());

app.use(session({
  store: new pgSession({
    pool: pool,            // usa il pool PostgreSQL esistente
    tableName: 'session', //nome tabella db
  }),
  secret: process.env.SESSION_SECRET || 'una-chiave-segreta',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // metti true solo se usi HTTPS
    sameSite: 'lax',
    maxAge: 2 * 60 * 60 * 1000, // 2 ore in ms
  }
}));

// Configurazione multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,            // porta SSL
  secure: true,         // usa SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // in locale, evita rotture con certificati
  },
});




app.get("/", (req, res) => {
  res.send("qua t'appost");
});
app.post('/api/register', async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ message: 'Email, username e password sono obbligatori' });
  }

  try {
    // 🔍 Controllo email già registrata
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'L\'email è già registrata' });
    }

    // 🔍 Controllo username già in uso
    const usernameCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Nome utente già in uso' });
    }

    // 🔐 Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 🎟️ Token di conferma
    const confirmationToken = uuidv4();

    // 💾 Salvo utente NON confermato
    await pool.query(
      `INSERT INTO users 
        (email, password, username, confirmation_token, confirmed, created_at)
       VALUES ($1, $2, $3, $4, false, NOW())`,
      [email, hashedPassword, username, confirmationToken]
    );

    // 🔗 Link di conferma
    const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
    const confirmationLink = `${baseUrl}/api/confirm-email?token=${confirmationToken}`;
    console.log('Link conferma generato:', confirmationLink);

    // ✉️ Provo ad inviare l'email, ma se fallisce NON blocco la registrazione
    const mailOptions = {
      from: 'TrueLens <truesubs2025@gmail.com>',
      to: email,
      subject: 'Conferma la tua registrazione su TrueLens',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f9; color: #333;">
          <h2 style="color: #2c3e50;">Benvenuto ${username}!</h2>
          <p>Per completare la tua registrazione, clicca sul link qui sotto per confermare la tua email:</p>
          <a href="${confirmationLink}" style="background-color: #3498db; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">Conferma la tua email</a>
          <p style="margin-top: 20px;">Se non hai richiesto questa registrazione, ignora questa email.</p>
          <hr style="border: 1px solid #ddd;">
          <p style="font-size: 12px; color: #777;">Il team di TrueLens</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Email di conferma inviata correttamente.");
    } catch (mailErr) {
      console.error("Errore nell'invio dell'email di conferma (NON blocco la registrazione):", mailErr);
    }

    return res.status(200).json({
      message:
        'Registrazione avvenuta. Se non ricevi la mail, copia il link di conferma dalla console del server.'
    });

  } catch (err) {
    console.error("Errore registrazione:", err.stack);
    return res.status(500).json({ message: 'Errore durante la registrazione' });
  }
});



// Nuova API per la conferma dell'email
app.get('/api/confirm-email', async (req, res) => {
  const { token } = req.query;
  console.log('Percorso usato:', req.path);
  if (!token) {
    return res.status(400).json({ message: 'Token mancante' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE confirmation_token = $1', [token]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Token non valido' });
    }

    const user = result.rows[0];

    if (user.confirmed) {
      return res.status(400).json({ message: 'L\'email è già confermata' });
    }

    await pool.query('UPDATE users SET confirmed = true WHERE confirmation_token = $1', [token]);

    res.status(200).json({ message: 'Email confermata con successo!' });
  } catch (err) {
    console.error("Errore nella conferma dell'email:", err.stack);
    res.status(500).json({ message: 'Errore durante la conferma dell\'email' });
  }
});

// Registro creator (versione DEV, senza conferma email / invio mail)
app.post('/api/creator/register', upload.single('profile_picture'), async (req, res) => {
  const { email, password, username, descrizione } = req.body;

  // ✅ Controllo campi obbligatori
  if (!email || !password || !username || !descrizione) {
    return res.status(400).json({ message: "Tutti i campi sono obbligatori." });
  }

  try {
    // ✅ Controllo se esiste già un creator con la stessa email
    const creatorCheck = await pool.query('SELECT * FROM creators WHERE email = $1', [email]);
    if (creatorCheck.rows.length > 0) {
      return res.status(400).json({ message: 'L\'email è già registrata come creator' });
    }

    // ✅ Hash della password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ Path dell'immagine profilo se presente
    const profilePicPath = req.file ? `/uploads/${req.file.filename}` : null;

    // ✅ Insert SEMPLIFICATO: niente confirmation_token, creator già confermato
    const query = `
      INSERT INTO creators
        (name, email, password, description, confirmed, created_at, profile_picture)
      VALUES ($1, $2, $3, $4, true, NOW(), $5)
      RETURNING id, name, email, description, profile_picture
    `;

    const values = [
      username,
      email,
      hashedPassword,
      descrizione,
      profilePicPath
    ];

    const result = await pool.query(query, values);
    const newCreator = result.rows[0];

    console.log(`Nuovo creator inserito con ID ${newCreator.id}`);

    // 👇 Nessuna email, nessun token: risposta diretta
    return res.status(200).json({
      message: 'Registrazione come creator avvenuta con successo (DEV, senza conferma email).',
      creator: newCreator
    });
  } catch (err) {
    console.error("Errore durante la registrazione del creator:", err.stack);
    return res.status(500).json({ message: 'Errore nella registrazione del creator' });
  }
});


app.post('/api/creator/upload-media', upload.array('media', 10), async (req, res) => {
  const creatorId = req.body.creatorId;
  if (!creatorId) return res.status(400).json({ error: 'Creator ID mancante' });

  try {
    const savedUrls = [];
    for (const file of req.files) {
      // 1. Carica file su storage cloud (es. AWS S3) e ottieni URL
      const url = await uploadToS3(file); // funzione ipotetica da implementare

      // 2. Salva nel DB
      const mediaType = file.mimetype.startsWith('video') ? 'video' : 'image';
      await pool.query(
        `INSERT INTO creator_media (creator_id, media_url, media_type) VALUES ($1, $2, $3)`,
        [creatorId, url, mediaType]
      );
      savedUrls.push(url);
    }
    res.status(200).json({ message: 'File caricati con successo', urls: savedUrls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Nuova API per la conferma dell'email del creator
app.get('/api/confirm-creator-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'Token mancante' });
  }

  try {
    const result = await pool.query('SELECT * FROM creators WHERE confirmation_token = $1', [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Token non valido' });
    }

    const creator = result.rows[0];

    if (creator.confirmed) {
      return res.status(400).json({ message: 'L\'email è già confermata' });
    }

    await pool.query('UPDATE creators SET confirmed = true WHERE confirmation_token = $1', [token]);

    res.status(200).json({ message: 'Email confermata con successo!' });
  } catch (err) {
    console.error("Errore nella conferma dell'email del creator:", err.stack);
    res.status(500).json({ message: 'Errore durante la conferma dell\'email del creator' });
  }
});
// API per il login unificato
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  console.log('Email:', email);
  console.log('Password:', password);

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e password sono obbligatori' });
  }

  try {
    // 1. Cerca tra gli utenti normali
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Password errata' });
      }

      if (!user.confirmed) {
        return res.status(400).json({ message: 'L\'email non è stata confermata' });
      }

      req.session.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: "user"
      };

      return res.status(200).json({
        message: 'Login utente effettuato con successo',
        user: req.session.user
      });
    }

    // 2. Se non è un utente, prova tra i creator
    const creatorResult = await pool.query('SELECT * FROM creators WHERE email = $1', [email]);
    const creator = creatorResult.rows[0];

    if (creator) {
      const isMatch = await bcrypt.compare(password, creator.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Password errata' });
      }

      req.session.user = {
        id: creator.creator_id,
        email: creator.email,
        username: creator.username,
        role: "creator"
      };

      return res.status(200).json({
        message: 'Login creator effettuato con successo',
        user: req.session.user
      });
    }

    // Se non trovato in nessuna tabella
    return res.status(400).json({ message: 'Utente non trovato' });

  } catch (err) {
    console.error('Errore durante il login:', err.stack);
    res.status(500).json({ message: 'Errore durante il login' });
  }
});


// Endpoint per la ricerca dei creator
app.get("/api/creators", async (req, res) => {
  const query = req.query.q;

  if (!query || query.trim().length < 2) {
    return res.json([]);
  }

  try {
    const searchTerm = `%${query.toLowerCase()}%`;

    const result = await pool.query(
      `SELECT id, name, profile_picture FROM creators WHERE LOWER(name) LIKE $1`,
      [searchTerm]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Errore nella ricerca creator:", err);
    res.status(500).json({ message: "Errore del server" });
  }
});

// Endpoint per la home: lista completa dei creator per le CreatorCard
app.get("/api/creators/list", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, profile_picture 
       FROM creators
       WHERE confirmed = true
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Errore nel recupero dei creators per la home:", err);
    res.status(500).json({ message: "Errore del server" });
  }
});

app.get('/api/check-session', async (req, res) => {
  if (req.session.user) {
    const userId = req.session.user.id;

    try {
      const result = await pool.query(
        'SELECT id, email, username, avatar FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.json({ loggedIn: false });
      }

      const user = result.rows[0];

      const userWithAvatar = {
        ...user,
        avatar: user.avatar
          ? `http://localhost:5001/uploads/${user.avatar}`  // aggiusta il percorso se serve
          : null,
      };

      return res.json({ loggedIn: true, user: userWithAvatar });
    } catch (error) {
      console.error('Errore nel recupero utente:', error);
      return res.status(500).json({ loggedIn: false, error: 'Server error' });
    }
  } else {
    return res.json({ loggedIn: false });
  }
});

 
app.get('/api/user', (req, res) => {
  if (req.session.user) {
    // restituisci i dati che avevi salvato in req.session.user
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: 'Non autenticato' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Errore durante logout');
    }
    res.clearCookie('connect.sid',{ path: '/', httpOnly: true }); // o il nome che hai messo nel session cookie
    res.sendStatus(200);
  });
});
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.use((err, req, res, next) => {
  console.error('Errore generico:', err);
  res.status(500).json({ message: 'Errore interno del server' });
});

app.get('/api/user/settings', async (req, res) => {
  const userId = req.user.user_id;
  try {
    const result = await pool.query(
      'SELECT username, email, avatar, payment_method FROM users WHERE id = $1',
      [userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel caricamento profilo' });
  }
});

// PUT per aggiornare dati profilo
app.put('/api/user/settings', upload.single('avatar'), async (req, res) => {
  const userId = req.user.user_id;
  const { username, currentPassword, newPassword, paymentMethod = 'Nessun metodo' } = req.body;

  try {
    const user = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    const isMatch = await bcrypt.compare(currentPassword, user.rows[0].password);
    if (!isMatch) return res.status(401).json({ error: 'Password attuale errata' });

    const hashedPassword = newPassword ? await bcrypt.hash(newPassword, 10) : user.rows[0].password;
    const avatar = req.file ? `/uploads/${req.file.filename}` : undefined;

let query = 'UPDATE users SET username = $1, password = $2, ';
const values = [username, hashedPassword];
let paramIndex = 3; // prossimo placeholder

// PUT per aggiornare dati profilo del creator
app.put('/api/creator/settings', upload.single('avatar'), async (req, res) => {
  const creatorId = req.user.creator_id;
  const { username, currentPassword, newPassword, paymentMethod = 'Nessun metodo' } = req.body;

  try {
    const creator = await pool.query('SELECT password FROM creators WHERE id = $1', [creatorId]);
    const isMatch = await bcrypt.compare(currentPassword, creator.rows[0].password);
    if (!isMatch) return res.status(401).json({ error: 'Password attuale errata' });

    const hashedPassword = newPassword
      ? await bcrypt.hash(newPassword, 10)
      : creator.rows[0].password;

    const profile_picture = req.file ? `/uploads/${req.file.filename}` : undefined;

    let query = 'UPDATE creators SET username = $1, password = $2, ';
    const values = [username, hashedPassword];
    let paramIndex = 3;

    if (profile_picture) {
      query += `profile_picture = $${paramIndex}, `;
      values.push(profile_picture);
      paramIndex++;
    }

    query += `payment_method = $${paramIndex} WHERE id = $${paramIndex + 1} RETURNING *`;
    values.push(paymentMethod, creatorId);

    const updated = await pool.query(query, values);
    res.json(updated.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore durante l’aggiornamento del profilo creator" });
  }
});

if (avatar) {
  query += `avatar = $${paramIndex}, `;
  values.push(avatar);
  paramIndex++;
}

query += `payment_method = $${paramIndex} WHERE user_id = $${paramIndex + 1}`;

values.push(paymentMethod, userId);

await pool.query(query, values);


    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel salvataggio' });
  }
});

/* ------------------------------------------------------------------
   CAMBIO PASSWORD DIRETTO DAL PROFILO
   ------------------------------------------------------------------ */
app.post('/api/change-password', async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  // Controllo campi
  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Dati mancanti' });
  }

  try {
    /* 1. Recupera l’utente */
    const result = await pool.query(
      'SELECT password FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    /* 2. Verifica la password attuale */
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Password attuale errata' });
    }

    /* 3. Cripta e salva la nuova password */
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashed, email]
    );

    res.status(200).json({ message: 'Password aggiornata con successo' });
  } catch (err) {
    console.error('Errore cambio password:', err);
    res.status(500).json({ message: 'Errore interno' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token o nuova password mancanti' });
  }

  try {
    const user = await pool.query('SELECT * FROM users WHERE reset_token = $1', [token]);
    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Token non valido' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL WHERE reset_token = $2',
      [hashedPassword, token]
    );

    res.status(200).json({ message: 'Password aggiornata con successo' });
  } catch (err) {
    console.error("Errore nel reset della password:", err);
    res.status(500).json({ message: 'Errore interno' });
  }
});

app.post("/api/update-profile", upload.single("avatar"), authenticateToken, async (req, res) => {
  console.log("Utente autenticato:", req.user);
  const userId = isCreator ? req.user.id : req.user.user_id;   // attenzione: qui potresti dover usare req.user.id se per creator è diverso
  const isCreator = req.user.role === "creator";
  const { username, name } = req.body; // accettiamo entrambi, user o creator

  try {
    const values = [];
    const setParts = [];

    // Campo username o name da aggiornare a seconda del tipo
    if (isCreator && name) {
      setParts.push(`name = $${values.length + 1}`);
      values.push(name);
    } else if (!isCreator && username) {
      setParts.push(`username = $${values.length + 1}`);
      values.push(username);
    }

    if (req.file) {
      const avatarPath = `/uploads/${req.file.filename}`;
      if (isCreator) {
        setParts.push(`profile_picture = $${values.length + 1}`);
      } else {
        setParts.push(`avatar = $${values.length + 1}`);
      }
      values.push(avatarPath);
    }

    if (setParts.length === 0) {
      return res.status(400).json({ error: "No updates" });
    }

    values.push(userId);

    const tableName = isCreator ? "creators" : "users";

    // Colonne da restituire dinamicamente
    const returningFields = isCreator
      ? "id, name, email, profile_picture"
      : "id, username, email, avatar";

    const query = `
      UPDATE ${tableName}
      SET ${setParts.join(", ")}
      WHERE id = $${values.length}
      RETURNING ${returningFields}
    `;

    const result = await pool.query(query, values);
    const updatedUser = result.rows[0];

    // Costruiamo la risposta adattandola
    const responseUser = isCreator
      ? {
          id: updatedUser.id,
          username: updatedUser.name,
          email: updatedUser.email,
          avatar: updatedUser.profile_picture
            ? `http://localhost:5001${updatedUser.profile_picture}`
            : null,
        }
      : {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          avatar: updatedUser.avatar
            ? `http://localhost:5001${updatedUser.avatar}`
            : null,
        };

    res.json(responseUser);

  } catch (err) {
    console.error("Errore aggiornamento profilo:", err);
    res.status(500).json({ error: "Errore aggiornamento" });
  }
});



app.listen(port, () => {
  console.log(`Server in esecuzione su http://localhost:${port}`);
});
