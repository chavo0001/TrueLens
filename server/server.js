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
const exifr = require("exifr");
const sharp = require("sharp");
const heicConvert = require("heic-convert");

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

// CORS (sessioni cookie)
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
   04.1) DB aggiunge colonne se mancano
   ================================ */

async function ensureUsersSchema() {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT true;`);
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


const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Per l'upload del portfolio
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
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/octet-stream", // ← fondamentale per iPhone
  ];

  if (!file.mimetype || !allowedMimeTypes.includes(file.mimetype)) {
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
   08) TEST 
   ================================ */
app.get("/api/ping", (req, res) => res.json({ ok: true, port }));

//upload avatar (in cartella locale dentro /uploads/avatar)
const avatarsDir = path.join(__dirname, "uploads", "avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  },
});


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
      `INSERT INTO users (email, password, username, confirmed, confirmation_token)
       VALUES ($1,$2,$3,false,$4)`,
      [email, hashed, username, token]
    );
console.log("TOKEN GENERATO:", token);

const check = await pool.query(
  `SELECT id, email, confirmed, confirmation_token
   FROM users
   WHERE email = $1
   ORDER BY created_at DESC
   LIMIT 1`,
  [email]
);

console.log("DB SUBITO DOPO INSERT:", check.rows[0]);
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

console.log("TOKEN RICEVUTO DA LINK:", token);

const before = await pool.query(
  `SELECT id, email, confirmed, confirmation_token
   FROM users
   WHERE confirmation_token = $1`,
  [token]
);

console.log("DB PRIMA CONFIRM:", before.rows);

  try {
    const r = await pool.query(
      `UPDATE users
       SET confirmed=true, confirmation_token=NULL
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
  const { identifier, email, password } = req.body;

  // Accetta sia "identifier" (username) sia "email"
  const loginId = (identifier || email || "").trim();

  if (!loginId || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  try {
    // Cerca utente per email oppure username
    const result = await pool.query(
      `
      SELECT id, email, username, password, avatar, bio, confirmed
      FROM users
      WHERE LOWER(email) = LOWER($1)
      OR LOWER(username) = LOWER($1)

      LIMIT 1
      `,
      [loginId]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    if (!user.confirmed) {
      return res.status(403).json({ error: "Email not confirmed" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // salva la sessione (con avatar, così navbar ok anche dopo logout/login)
    req.session.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio || null,
      confirmed: user.confirmed,
    };

    return res.json({
      ok: true,
      user: req.session.user,
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/api/check-session", async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.json({ loggedIn: false });
    }

    const userId = req.session.user.id;

    const r = await pool.query(
      "SELECT id, email, username, avatar, bio FROM users WHERE id=$1",
      [userId]
    );

    if (r.rowCount === 0) {
      
      return res.json({ loggedIn: false });
    }

    //sessione sincronizzata
    req.session.user = {
      ...req.session.user,
      id: r.rows[0].id,
      email: r.rows[0].email,
      username: r.rows[0].username,
      avatar: r.rows[0].avatar,
      bio: r.rows[0].bio,
    };

    return res.json({ loggedIn: true, user: r.rows[0] });
  } catch (err) {
    console.error("Errore /api/check-session:", err);
    return res.status(500).json({ error: "Server error" });
  }
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

app.get("/api/me", requireSession, async (req, res) => {
  try {
    // req.user arriva da requireSession = req.session.user
    const userId = req.user.id;

    const r = await pool.query(
      "SELECT id, email, username, avatar, bio FROM users WHERE id=$1",
      [userId]
    );

    if (r.rowCount === 0) return res.status(404).json({ message: "User not found" });

    res.json({ user: r.rows[0] });
  } catch (err) {
    console.error("Errore /api/me:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/api/me/profile", requireSession, async (req, res) => {
  const userId = req.user.id;
  let { username, bio } = req.body;

  username = (username || "").trim();
  bio = (bio || "").trim();

  if (!username) return res.status(400).json({ error: "Username is required" });
  if (username.length < 3) return res.status(400).json({ error: "Username too short" });
  if (username.length > 30) return res.status(400).json({ error: "Username too long" });
  if (bio.length > 180) return res.status(400).json({ error: "Bio too long (max 180)" });

  try {
    // Username unico (gestisce il conflitto)
    const r = await pool.query(
      `
      UPDATE users
      SET username = $1,
          bio = $2
      WHERE id = $3
      RETURNING id, email, username, bio, avatar
      `,
      [username, bio, userId]
    );

    const updated = r.rows[0];

    // aggiorna anche la sessione (così la UI vede subito il nuovo username)
    req.session.user = {
      ...req.session.user,
      id: updated.id,
      email: updated.email,
      username: updated.username,
    };

    res.json({ ok: true, user: updated });
  } catch (err) {
    // errore unique constraint su username
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username already taken" });
    }
    console.error("PATCH /api/me/profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/me/avatar", requireSession, uploadAvatar.single("avatar"), async (req, res) => {
  const userId = req.user.id;

  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    // elimina avatar vecchio dal disco
    const prev = await pool.query("SELECT avatar FROM users WHERE id=$1", [userId]);
    const oldAvatar = prev.rows[0]?.avatar; // es: "/uploads/avatars/xxx.jpg"

    const newAvatarPath = `/uploads/avatars/${req.file.filename}`;

    const r = await pool.query(
      `UPDATE users SET avatar=$1 WHERE id=$2 RETURNING id, email, username, bio, avatar`,
      [newAvatarPath, userId]
    );

    // aggiorna sessione
    req.session.user = { ...req.session.user, id: r.rows[0].id, email: r.rows[0].email, username: r.rows[0].username };

    // prova a cancellare vecchio avatar se esiste ed è nella cartella avatars
    if (oldAvatar && oldAvatar.includes("/uploads/avatars/")) {
      const filename = oldAvatar.replace(/^\/?uploads\/avatars\//, "");
      const absOld = path.join(avatarsDir, filename);
      fs.promises.unlink(absOld).catch(() => {});
    }

    res.json({ ok: true, user: r.rows[0] });
  } catch (err) {
    console.error("POST /api/me/avatar error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   10) PORTFOLIO / UPLOAD (collegato a user) + likes
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

async function ensurePhotoLikesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS photo_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        photo_id INTEGER NOT NULL REFERENCES user_images(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (user_id, photo_id)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_photo_likes_photo_id ON photo_likes(photo_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_photo_likes_user_id ON photo_likes(user_id);
    `);
  } catch (err) {
    console.error("❌ Errore creazione tabella photo_likes:", err.message);
  }
}
ensurePhotoLikesTable();

//mostra i dati Exif delle foto postate
async function ensurePhotoExifTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS photo_exif (
        photo_id INTEGER PRIMARY KEY REFERENCES user_images(id) ON DELETE CASCADE,

        camera_make TEXT,
        camera_model TEXT,
        lens_model TEXT,

        f_number NUMERIC,
        exposure_time TEXT,
        iso INTEGER,
        focal_length_mm NUMERIC,

        width_px INTEGER,
        height_px INTEGER,

        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
  } catch (err) {
    console.error("❌ Errore creazione tabella photo_exif:", err.message);
  }
}
ensurePhotoExifTable();

function formatExposureTime(exposureTime) {
  if (!exposureTime) return null;

  if (typeof exposureTime === "string") return exposureTime;

  if (typeof exposureTime === "number") {
    if (exposureTime >= 1) return `${exposureTime}s`;

    const denom = Math.round(1 / exposureTime);
    if (denom > 0) return `1/${denom}`;
  }

  return String(exposureTime);
}

function toNumberOrNull(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}


// Upload portfolio (user loggato) + dati Exif delle foto postate
app.post(
  "/api/me/photos",
  requireSession,
  uploadPortfolio.fields([
    { name: "photo", maxCount: 40 },
    { name: "photos", maxCount: 40 },
  ]),
  async (req, res) => {
    const userId = req.user.id;
    const caption = (req.body.caption || "").trim() || null;

    try {
      
      const files = [
        ...(req.files?.photo || []),
        ...(req.files?.photos || []),
      ];

      if (!files.length) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const inserted = [];

      for (const f of files) {
  
let finalFilename = f.filename;
let absPath = path.join(__dirname, "uploads", f.filename);

// Se iPhone manda mimetype strano, usiamo anche l'estensione originale
const originalExt = (path.extname(f.originalname || "") || "").toLowerCase();

const isHeic =
  f.mimetype === "image/heic" ||
  f.mimetype === "image/heif" ||
  originalExt === ".heic" ||
  originalExt === ".heif";

if (isHeic) {
  try {
    const inputBuffer = await fs.promises.readFile(absPath);

    const outputBuffer = await heicConvert({
      buffer: inputBuffer,
      format: "JPEG",
      quality: 0.95,
    });

    // nuovo nome file .jpg
    finalFilename = f.filename.replace(/\.[^/.]+$/, ".jpg");
    const finalAbsPath = path.join(__dirname, "uploads", finalFilename);

    // scrivi jpg su disco
    await sharp(outputBuffer).toFile(finalAbsPath);

    // elimina heic originale
    await fs.promises.unlink(absPath);

    // aggiorna absPath per EXIF
    absPath = finalAbsPath;
  } catch (e) {
    console.error("HEIC convert error:", e);
    // se fallisce, continua con il file originale (o puoi return 400)
  }
}

const filePath = `/uploads/${finalFilename}`;
 
        // 1) Inserisci foto
        const r = await pool.query(
          `INSERT INTO user_images (user_id, file_path, caption)
           VALUES ($1,$2,$3)
           RETURNING id, user_id, file_path, caption, created_at`,
          [userId, filePath, caption]
        );

        const photoRow = r.rows[0];
        inserted.push(photoRow);

        // 2) Estrai EXIF dal file fisico

        let exif = null;
        try {
          exif = await exifr.parse(absPath, {
            // camera / lens
            make: true,
            model: true,
            lensModel: true,

            // scatto
            fNumber: true,
            exposureTime: true,
            iso: true,
            focalLength: true,

            // dimensioni
            ExifImageWidth: true,
            ExifImageHeight: true,
            ImageWidth: true,
            ImageHeight: true,
          });
          console.log("EXIF KEYS:", exif ? Object.keys(exif) : exif);
          console.log("EXIF SAMPLE:", exif);

        } catch (e) {
          exif = null;
        }

        // 3) Salva EXIF (solo se c'è qualcosa di utile)
       if (exif) {
  const width = exif.ExifImageWidth ?? exif.ImageWidth ?? exif.Width ?? null;
  const height = exif.ExifImageHeight ?? exif.ImageHeight ?? exif.Height ?? null;

  const payload = {
    camera_make: exif.Make ?? null,
    camera_model: exif.Model ?? null,
    lens_model: exif.LensModel ?? null,

    f_number: toNumberOrNull(exif.FNumber),
    exposure_time: formatExposureTime(exif.ExposureTime),
    iso: exif.ISO ?? null,
    focal_length_mm: toNumberOrNull(exif.FocalLength),

    width_px: width ? Number(width) : null,
    height_px: height ? Number(height) : null,
  };

  const hasAnyExif = Object.values(payload).some(
    (v) => v !== null && v !== undefined && v !== ""
  );

  if (hasAnyExif) {
    await pool.query(
      `
      INSERT INTO photo_exif
        (photo_id, camera_make, camera_model, lens_model,
         f_number, exposure_time, iso, focal_length_mm,
         width_px, height_px)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (photo_id) DO UPDATE SET
        camera_make = EXCLUDED.camera_make,
        camera_model = EXCLUDED.camera_model,
        lens_model = EXCLUDED.lens_model,
        f_number = EXCLUDED.f_number,
        exposure_time = EXCLUDED.exposure_time,
        iso = EXCLUDED.iso,
        focal_length_mm = EXCLUDED.focal_length_mm,
        width_px = EXCLUDED.width_px,
        height_px = EXCLUDED.height_px
      `,
      [
        photoRow.id,
        payload.camera_make,
        payload.camera_model,
        payload.lens_model,
        payload.f_number,
        payload.exposure_time,
        payload.iso,
        payload.focal_length_mm,
        payload.width_px,
        payload.height_px,
      ]
    );
  }
}
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
      `
      SELECT
        ui.id,
        ui.file_path,
        ui.created_at,
        COUNT(pl.id)::int AS "likesCount",
        EXISTS (
          SELECT 1 FROM photo_likes pl2
          WHERE pl2.photo_id = ui.id AND pl2.user_id = $1
        ) AS "likedByMe"
      FROM user_images ui
      LEFT JOIN photo_likes pl ON pl.photo_id = ui.id
      WHERE ui.user_id = $1
      GROUP BY ui.id
      ORDER BY ui.created_at DESC
      `,
      [userId]
    );

    res.json({ photos: photosRes.rows });
  } catch (err) {
    console.error("Errore get portfolio:", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

   //cancella foto da input dell'user (cancella sia da db che da /upload locale)
app.delete("/api/me/photos/:photoId", requireSession, async (req, res) => {
  const userId = req.user.id;
  const photoId = Number(req.params.photoId);

  if (!photoId) return res.status(400).json({ error: "Invalid photoId" });

  try {
    const r = await pool.query(
      "SELECT id, file_path FROM user_images WHERE id=$1 AND user_id=$2",
      [photoId, userId]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "Photo not found or not yours" });
    }

    const filePath = r.rows[0].file_path; // es: "/uploads/abc.jpg"

    //elimina la riga DB
    await pool.query("DELETE FROM user_images WHERE id=$1 AND user_id=$2", [
      photoId,
      userId,
    ]);

    //elimina il file fisico 
    const uploadsDir = path.resolve(__dirname, "uploads");

    const filename = String(filePath).replace(/^\/?uploads\//, "");
    const absPath = path.join(uploadsDir, filename);

    try {
      await fs.promises.unlink(absPath);
    } catch (err) {
      // non blocca la delete DB se il file non esiste 
      console.warn("File delete warning:", err.message, "absPath:", absPath);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/me/photos error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

//mostra dati exif delle foto (f, tempo, ISO ecc)
app.get("/api/photos/:photoId/exif", async (req, res) => {
  const photoId = Number(req.params.photoId);
  if (!photoId) return res.status(400).json({ error: "Invalid photoId" });

  try {
    const r = await pool.query(
      `SELECT photo_id, camera_make, camera_model, lens_model,
              f_number, exposure_time, iso, focal_length_mm,
              width_px, height_px
       FROM photo_exif
       WHERE photo_id = $1`,
      [photoId]
    );

    if (!r.rows.length) return res.json({ exif: null });

    return res.json({ exif: r.rows[0] });
  } catch (err) {
    console.error("EXIF fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Toggle like su una foto (serve il login)
app.post("/api/photos/:photoId/like", requireSession, async (req, res) => {
  const userId = req.user.id;
  const photoId = Number(req.params.photoId);

  if (!Number.isInteger(photoId)) {
    return res.status(400).json({ error: "Invalid photoId" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // check foto esiste
    const exists = await client.query("SELECT id FROM user_images WHERE id = $1", [photoId]);
    if (exists.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Photo not found" });
    }

    // prova insert (se già esiste non fa nulla)
    const ins = await client.query(
      `INSERT INTO photo_likes (user_id, photo_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, photo_id) DO NOTHING
       RETURNING id`,
      [userId, photoId]
    );

    let liked;
    if (ins.rowCount === 1) {
      liked = true;
    } else {
      await client.query(
        "DELETE FROM photo_likes WHERE user_id = $1 AND photo_id = $2",
        [userId, photoId]
      );
      liked = false;
    }

    const countRes = await client.query(
      "SELECT COUNT(*)::int AS likes_count FROM photo_likes WHERE photo_id = $1",
      [photoId]
    );

    await client.query("COMMIT");
    return res.json({ liked, likesCount: countRes.rows[0].likes_count });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/photos/:photoId/like error:", err);
    return res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

app.get("/api/users/:id/likes-total", async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: "Invalid user id" });

  try {
    const r = await pool.query(
      `SELECT COUNT(*)::int AS likes_total
       FROM photo_likes pl
       JOIN user_images ui ON ui.id = pl.photo_id
       WHERE ui.user_id = $1`,
      [userId]
    );
    res.json({ likesTotal: r.rows[0].likes_total });
  } catch (err) {
    console.error("GET /api/users/:id/likes-total error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

//followers
app.post("/api/users/:id/follow", requireSession, async (req, res) => {
  const followerId = req.user.id;
  const followingId = Number(req.params.id);

  if (!followingId || followerId === followingId) {
    return res.status(400).json({ error: "Invalid user" });
  }

  try {
    const exists = await pool.query(
      `SELECT 1 FROM followers WHERE follower_id=$1 AND following_id=$2`,
      [followerId, followingId]
    );

    // unfollow
    if (exists.rowCount > 0) {
      await pool.query(
        `DELETE FROM followers WHERE follower_id=$1 AND following_id=$2`,
        [followerId, followingId]
      );
      return res.json({ following: false });
    }

    // follow
    await pool.query(
      `INSERT INTO followers (follower_id, following_id) VALUES ($1,$2)`,
      [followerId, followingId]
    );

    // registra evento follow 
     await pool.query(
      `
      INSERT INTO follow_events (user_id, follower_id)
      SELECT $1, $2
      WHERE NOT EXISTS (
        SELECT 1
        FROM follow_events
        WHERE user_id = $1
          AND follower_id = $2
          AND created_at > now()  
      )
      `,
      [followingId, followerId]
    );

    return res.json({ following: true });
  } catch (err) {
    console.error("follow error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


//conta followers
app.get("/api/users/:id/followers-count", async (req, res) => {
  const userId = Number(req.params.id);

  const r = await pool.query(
    `SELECT COUNT(*)::int AS count FROM followers WHERE following_id=$1`,
    [userId]
  );

  res.json({ followersCount: r.rows[0].count });
});

//conta following
app.get("/api/users/:id/following-count", async (req, res) => {
  const userId = Number(req.params.id);

  const r = await pool.query(
    `SELECT COUNT(*)::int AS count FROM followers WHERE follower_id=$1`,
    [userId]
  );

  res.json({ followingCount: r.rows[0].count });
});

app.get("/api/users/:id/follow-status", requireSession, async (req, res) => {
  const followerId = req.user.id;
  const followingId = Number(req.params.id);

  const r = await pool.query(
    `SELECT 1 FROM followers WHERE follower_id=$1 AND following_id=$2`,
    [followerId, followingId]
  );

  res.json({ following: r.rowCount > 0 });
});

app.get("/api/users/:id/followers", async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: "Invalid user id" });

  // viewer = utente loggato (se c'è)
  const viewerId = req.user?.id || req.session?.user?.id || null;


  try {
    // Lista followers del profilo userId
    // + isFollowing: se viewerId segue quel follower (utile per mostrare Follow/Following nella lista)
    const r = await pool.query(
      `
      SELECT 
        u.id,
        u.username,
        u.avatar,
        CASE 
          WHEN $2::int IS NULL THEN false
          WHEN u.id = $2::int THEN false
          ELSE EXISTS (
            SELECT 1
            FROM followers f2
            WHERE f2.follower_id = $2::int
              AND f2.following_id = u.id
          )
        END AS "isFollowing"
      FROM followers f
      JOIN users u ON u.id = f.follower_id
      WHERE f.following_id = $1
      ORDER BY f.created_at DESC
      `,
      [userId, viewerId]
    );

    res.json({ followers: r.rows });
  } catch (err) {
    console.error("followers list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
//notifiche follow
app.get("/api/notifications/follow-events", requireSession, async (req, res) => {
  const userId = req.user.id;
  const afterId = Number(req.query.afterId || 0);

  try {
    const eventsRes = await pool.query(
      `
      SELECT
        fe.id,
        fe.created_at,
        u.id AS follower_id,
        u.username,
        u.avatar
      FROM follow_events fe
      JOIN users u ON u.id = fe.follower_id
      WHERE fe.user_id = $1
        AND fe.id > $2
      ORDER BY fe.id ASC
      LIMIT 20
      `,
      [userId, afterId]
    );

    const events = eventsRes.rows;
    const latestId = events.length
      ? events[events.length - 1].id
      : afterId;

    res.json({ events, latestId });
  } catch (err) {
    console.error("follow events error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
//caso di follow non visto (perchè offline)
app.get("/api/notifications/unseen-followers", requireSession, async (req, res) => {
  const userId = req.user.id;

  try {
    const userRes = await pool.query(
      `SELECT last_followers_seen_at FROM users WHERE id = $1`,
      [userId]
    );

    const lastSeen = userRes.rows[0]?.last_followers_seen_at || new Date(0);

    const countRes = await pool.query(
      `
      SELECT COUNT(DISTINCT follower_id)::int AS count
      FROM follow_events
      WHERE user_id = $1
        AND created_at > $2
      `,
      [userId, lastSeen]
    );

    res.json({ count: countRes.rows[0].count });
  } catch (err) {
    console.error("unseen followers error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// segna follow visti
app.post("/api/notifications/mark-followers-seen", requireSession, async (req, res) => {
  const userId = req.user.id;

  try {
    await pool.query(
      `UPDATE users
       SET last_followers_seen_at = now()
       WHERE id = $1`,
      [userId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("mark followers seen error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/notifications/latest-follow-event-id", requireSession, async (req, res) => {
  const userId = req.user.id;

  try {
    const r = await pool.query(
      `SELECT COALESCE(MAX(id), 0)::int AS "latestId"
       FROM follow_events
       WHERE user_id = $1`,
      [userId]
    );

    res.json({ latestId: r.rows[0].latestId });
  } catch (err) {
    console.error("latest-follow-event-id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Cerca utenti che hanno almeno 1 foto
app.get("/api/users/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit) || 10, 25);

    if (q.length < 1) return res.json({ users: [] });

    const r = await pool.query(
      `
      SELECT
        u.id,
        u.username,
        u.avatar,
        COUNT(ui.id)::int AS photo_count
      FROM users u
      JOIN user_images ui ON ui.user_id = u.id
      WHERE u.username ILIKE $1
      GROUP BY u.id, u.username, u.avatar
      ORDER BY photo_count DESC, u.username ASC
      LIMIT $2
      `,
      [`%${q}%`, limit]
    );

    res.json({ users: r.rows });
  } catch (err) {
    console.error("Errore /api/users/search:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   10.1) ENDPOINT PROFILO + foto utente
   ================================ */
app.get("/api/users/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) return res.status(400).json({ error: "Invalid user id" });

    const userRes = await pool.query(
      "SELECT id, username, avatar, bio FROM users WHERE id=$1",
      [userId]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const currentUserId = req.session?.user?.id || null;

    const photosRes = await pool.query(
  `
  SELECT
    ui.id,
    ui.user_id,
    ui.file_path,
    ui.created_at,
    COUNT(pl.id)::int AS "likesCount",
    CASE
      WHEN $2::int IS NULL THEN false
      ELSE EXISTS (
        SELECT 1
        FROM photo_likes pl2
        WHERE pl2.photo_id = ui.id
          AND pl2.user_id = $2
      )
    END AS "likedByMe"
  FROM user_images ui
  LEFT JOIN photo_likes pl ON pl.photo_id = ui.id
  WHERE ui.user_id = $1
  GROUP BY ui.id
  ORDER BY ui.created_at DESC
  `,
  [userId, currentUserId]
);


    res.json({
      user: userRes.rows[0],
      photos: photosRes.rows,
    });
  } catch (err) {
    console.error("Errore /api/users/:id:", err);
    res.status(500).json({ error: "Server error" });
  }
});


/* ================================
   10.2) EXPLORE (foto di tutti gli utenti)
   ================================ */

app.get("/api/explore/photos", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 60, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const currentUserId = req.session?.user?.id || null;

   const r = await pool.query(
  `
SELECT
  ui.id,
  ui.file_path,
  ui.created_at,
  ui.caption,
  u.id AS user_id,
  u.username,
  u.avatar,
  COUNT(pl.id)::int AS "likesCount",
  CASE
    WHEN $3::int IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM photo_likes pl2
      WHERE pl2.photo_id = ui.id AND pl2.user_id = $3
    )
  END AS "likedByMe"
FROM user_images ui
JOIN users u ON u.id = ui.user_id
LEFT JOIN photo_likes pl ON pl.photo_id = ui.id
GROUP BY
  ui.id,
  ui.file_path,
  ui.created_at,
  ui.caption,
  u.id,
  u.username,
  u.avatar
ORDER BY ui.created_at DESC
LIMIT $1 OFFSET $2;
  `,
  [limit, offset, currentUserId]
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

// User settings 
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
app.post("/api/me/change-password", requireSession, async (req, res) => {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password too short (min 8)" });
  }

  try {
    const r = await pool.query("SELECT password FROM users WHERE id=$1", [userId]);
    if (r.rowCount === 0) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(oldPassword, r.rows[0].password);
    if (!ok) return res.status(401).json({ error: "Old password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password=$1 WHERE id=$2", [hashed, userId]);

    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/me/change-password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


/* ================================
   13) FRONTEND BUILD 
   ================================ */
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
