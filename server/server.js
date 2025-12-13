/* ======================================================================
   TrueLens Backend - server.js (funziona con cookie auth)
   - CommonJS (require)
   - Postgre (con PgAdmin)
   - Le sessioni vengono salvate in DB (Sempre con PgAdmin) => tramite connect.sid cookie
   - Gli uploads vengono salvati direttamente sul locale /server/uploads/*
   ====================================================================== */

/* ================================
   00) ENV + CORE
   ================================ */
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// (optional) prevent MaxListeners warnings during dev
require("events").EventEmitter.defaultMaxListeners = 20;

/* ================================
   01) IMPORTS
   ================================ */
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");

/* ================================
   02) APP
   ================================ */
const app = express();
const port = Number(process.env.PORT) || 5001;

/* ================================
   03) MIDDLEWARE GLOBALI
   ================================ */
app.use(morgan("combined"));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// static folders
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// CORS (cookie sessions)
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

/* ================================
   04) DB (PostgreSQL)
   ================================ */
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "TrueLens",
  password: process.env.DB_PASSWORD || "TrueSubs",
  port: Number(process.env.DB_PORT) || 5432,
});

pool
  .connect()
  .then((client) => {
    client.release();
    console.log("✅ Connesso al database PostgreSQL!");
  })
  .catch((err) => {
    console.error("❌ Errore di connessione DB:", err.stack);
  });

/* ================================
   04.1) DB - PATCH SCHEMA (DEV-FRIENDLY)
   ================================ */
/*
  Nel tuo DB attuale la tabella users NON ha alcune colonne che il backend usa
  (es: is_verified, confirmation_token...). Quindi in DEV le aggiungiamo se mancano.
  In produzione si farebbero migrations, ma qui l'obiettivo è farlo funzionare subito.
*/
async function ensureUsersSchema() {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS confirmation_token TEXT;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method TEXT;`);
  } catch (err) {
    console.error("❌ Errore patch schema users:", err.message);
  }
}
ensureUsersSchema();

/* ================================
   05) SESSIONI ( solo con auth cookie)
   ================================ */
app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "session",
    }),
    secret: process.env.SESSION_SECRET || "una-chiave-segreta",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // set true only behind HTTPS in prod
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000, // 2h
    },
  })
);

function requireSession(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Non autenticato" });
  }
  req.user = req.session.user;
  next();
}

/* ================================
   06) UPLOADS (uso di multer)
   ================================ */
const ensureUploadsDir = () => {
  const dir = path.join(__dirname, "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};
ensureUploadsDir();

// Avatar upload
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `avatar-${Date.now()}${ext || ".jpg"}`);
  },
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  },
});

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Per l'upload del portfolio (massimo 40 immmagini)
const portfolioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "uploads")),
  filename: (req, file, cb) => {
     const ext = path.extname(file.originalname);
    cb(null, `portfolio-${Date.now()}-${uuidv4()}${ext}`);
  },
});
const uploadPortfolio = multer({
  storage: portfolioStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  },
});

/* ================================
   07) MAIL (nodemailer)
   ================================ */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

/* ================================
   08) HEALTH
   ================================ */
app.get("/api/ping", (req, res) => res.json({ ok: true, port }));

/* ================================
   09) LE ROUTES AUTH 
   ================================ */

// Registrazione User (tramite verifica della mail)
app.post("/api/register", async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ message: "Email, password e username sono obbligatori" });
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (existing.rowCount > 0) return res.status(400).json({ message: "Email già registrata" });

    const hashed = await bcrypt.hash(password, 10);
    const token = uuidv4();

    await pool.query(
      `INSERT INTO users (email, password, username, is_verified, confirmation_token)
       VALUES ($1,$2,$3,false,$4)`,
      [email, hashed, username, token]
    );

    // Conferma mail
    try {
      const confirmUrl =
        (process.env.BACKEND_PUBLIC_URL || `http://localhost:${port}`) +
        `/api/confirm-email?token=${encodeURIComponent(token)}`;
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Conferma la tua email - TrueLens",
        text: `Clicca qui per confermare: ${confirmUrl}`,
      });
    } catch (mailErr) {
      console.warn("⚠️ Email non inviata (dev ok):", mailErr.message);
    }

    return res.status(201).json({ message: "Registrazione ok. Controlla email per conferma." });
  } catch (err) {
    console.error("Errore register:", err);
    return res.status(500).json({ message: "Errore server" });
  }
});

app.get("/api/confirm-email", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Token mancante");

  try {
    const r = await pool.query(
      `UPDATE users
       SET is_verified=true, confirmation_token=NULL
       WHERE confirmation_token=$1
       RETURNING id`,
      [token]
    );
    if (r.rowCount === 0) return res.status(400).send("Token non valido o già usato");
    return res.send("Email confermata! Ora puoi fare login.");
  } catch (err) {
    console.error("Errore confirm:", err);
    return res.status(500).send("Errore server");
  }
});

// Login => crea sessioni cookie connect.sid
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email e password sono obbligatori" });

  try {
    const userResult = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = userResult.rows[0];

    if (!user) return res.status(400).json({ message: "Utente non trovato" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Password errata" });

    // se la colonna esiste (la patch la crea), allora possiamo usarla
    if (user.is_verified === false) return res.status(403).json({ message: "Email non verificata" });

    // session cookie
    req.session.user = {
      id: user.id,
      email: user.email,
      username: user.username,
    };

    return res.status(200).json({ message: "Login ok", user: req.session.user });
  } catch (err) {
    console.error("Errore login:", err);
    return res.status(500).json({ message: "Errore server" });
  }
});

app.get("/api/check-session", (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ loggedIn: true, user: req.session.user });
  }
  return res.json({ loggedIn: false });
});

app.get("/api/user", (req, res) => {
  if (req.session && req.session.user) return res.json(req.session.user);
  return res.status(401).json({ message: "Non autenticato" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send("Errore durante logout");
    res.clearCookie("connect.sid", { path: "/", httpOnly: true });
    return res.sendStatus(200);
  });
});

/* ================================
   10) PORTFOLIO / UPLOAD (collegato a user)
   ================================ */
async function ensureUserImagesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_images (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        caption TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_images_user_id
      ON user_images(user_id);
    `);
  } catch (err) {
    console.error("❌ Errore creazione tabella user_images:", err.message);
  }
}
ensureUserImagesTable();

// Upload portfolio (user loggato)
app.post(
  "/api/me/photos",
  requireSession,
  uploadPortfolio.array("photos", 40),
  async (req, res) => {
    try {
      const userId = req.user.id;

      const files = req.files || [];
      if (!files.length) return res.status(400).json({ error: "No files uploaded" });

      const inserted = [];
      for (const f of files) {
        const filePath = `/uploads/${f.filename}`;
        const r = await pool.query(
          `INSERT INTO user_images (user_id, file_path)
           VALUES ($1,$2)
           RETURNING id, user_id, file_path, created_at`,
          [userId, filePath]
        );
        inserted.push(r.rows[0]);
      }

      res.json({ ok: true, count: inserted.length, uploaded: inserted });
    } catch (err) {
      console.error("Errore upload portfolio:", err);
      res.status(500).json({ error: "Server error", detail: err.message });
    }
  }
);

// Leggi portfolio dell'utente loggato
app.get("/api/me/photos", requireSession, async (req, res) => {
  try {
    const userId = req.user.id;

    const photosRes = await pool.query(
      `SELECT id, file_path, created_at
       FROM user_images
       WHERE user_id=$1
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ photos: photosRes.rows });
  } catch (err) {
    console.error("Errore get portfolio:", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

/* ================================
   10.2) EXPLORE (foto di tutti gli utenti)
   ================================ */

app.get("/api/explore/photos", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 60, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const r = await pool.query(
      `
      SELECT 
        ui.id,
        ui.file_path,
        ui.created_at,
        u.id AS user_id,
        u.username
      FROM user_images ui
      JOIN users u ON u.id = ui.user_id
      ORDER BY ui.created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    res.json({ photos: r.rows, limit, offset });
  } catch (err) {
    console.error("Errore explore/photos:", err);
    res.status(500).json({ error: "Server error" });
  }
});


/* ================================
   11) SETTINGS ROUTES (clean)
   ================================ */

// User settings (solo user, perché esiste solo user)
app.get("/api/user/settings", requireSession, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT username, email, avatar, payment_method FROM users WHERE id=$1",
      [userId]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error("Errore user/settings GET:", err);
    res.status(500).json({ error: "Errore nel caricamento profilo" });
  }
});

app.put("/api/user/settings", requireSession, uploadAvatar.single("avatar"), async (req, res) => {
  const userId = req.user.id;
  const { username, currentPassword, newPassword, paymentMethod } = req.body;

  try {
    const userRes = await pool.query("SELECT password, avatar FROM users WHERE id=$1", [userId]);
    if (userRes.rowCount === 0) return res.status(404).json({ error: "User not found" });

    // password update only if requested
    let hashedPassword = userRes.rows[0].password;
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: "currentPassword required" });
      const ok = await bcrypt.compare(currentPassword, hashedPassword);
      if (!ok) return res.status(400).json({ error: "Password attuale errata" });
      hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    const avatar = req.file ? `/uploads/${req.file.filename}` : userRes.rows[0].avatar;

    await pool.query(
      `UPDATE users
       SET username=$1, password=$2, avatar=$3, payment_method=$4
       WHERE id=$5`,
      [username || null, hashedPassword, avatar, paymentMethod || null, userId]
    );

    // keep session in sync (username)
    req.session.user.username = username || req.session.user.username;

    res.json({ message: "Profilo aggiornato" });
  } catch (err) {
    console.error("Errore user/settings PUT:", err);
    res.status(500).json({ error: "Errore aggiornamento profilo" });
  }
});

/* ================================
   12) PASSWORD RESET (kept minimal)
   ================================ */
app.post("/api/reset-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email obbligatoria" });

  try {
    const token = uuidv4();

    const u = await pool.query("UPDATE users SET reset_token=$1 WHERE email=$2 RETURNING id", [token, email]);

    if (u.rowCount === 0) return res.status(404).json({ message: "Email non trovata" });

    // best-effort email
    try {
      const resetUrl =
        (process.env.FRONTEND_PUBLIC_URL || (process.env.FRONTEND_ORIGIN || "http://localhost:3000")) +
        `/reset-password?token=${encodeURIComponent(token)}`;
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Reset password - TrueLens",
        text: `Reset password: ${resetUrl}`,
      });
    } catch (mailErr) {
      console.warn("⚠️ Email reset non inviata (dev ok):", mailErr.message);
    }

    res.json({ message: "Se l'email esiste, riceverai istruzioni per il reset." });
  } catch (err) {
    console.error("Errore reset-password:", err);
    res.status(500).json({ message: "Errore server" });
  }
});

app.post("/api/change-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ message: "Token e nuova password sono obbligatori" });

  try {
    const hashed = await bcrypt.hash(newPassword, 10);

    const u = await pool.query(
      "UPDATE users SET password=$1, reset_token=NULL WHERE reset_token=$2 RETURNING id",
      [hashed, token]
    );

    if (u.rowCount === 0) return res.status(400).json({ message: "Token non valido" });

    res.json({ message: "Password aggiornata" });
  } catch (err) {
    console.error("Errore change-password:", err);
    res.status(500).json({ message: "Errore server" });
  }
});

/* ================================
   13) FRONTEND BUILD (ALWAYS LAST)
   ================================ */
/*
  Se stai usando React in dev (npm start nel frontend), NON esiste /frontend/build.
  Quindi qui lo serviamo solo se build/index.html esiste.
*/
const buildDir = path.join(__dirname, "../frontend/build");
const buildIndex = path.join(buildDir, "index.html");

if (fs.existsSync(buildIndex)) {
  app.use(express.static(buildDir));
  app.get(/.*/, (req, res) => {
    res.sendFile(buildIndex);
  });
} else {
  console.log("frontend/build non trovato: ma normale perchè siamo ancora sul locale (per ora React dev server su :3000).");
}

/* ================================
   14) ERROR HANDLER 
   ================================ */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Errore interno del server" });
});

/* ================================
   15) START
   ================================ */
app.listen(port, () => {
  console.log(`✅ Server in esecuzione su http://localhost:${port}`);
});
