require("dotenv").config();
const express = require("express");
const { Client } = require("pg");
const path = require("path");

const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

/* =======================
   CONFIG
======================= */

const PORT = Number(process.env.PORT) || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const ADMIN_USER = process.env.ADMIN_USER || "uche";
const ADMIN_PASS = process.env.ADMIN_PASS || "unn123";
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

/* =======================
   POSTGRES CLIENT
======================= */

const pgClient = new Client({
  user: process.env.PG_USER || "postgres",
  host: process.env.PG_HOST || "localhost",
  database: process.env.PG_DATABASE || "pg_db",
  password: process.env.PG_PASSWORD || "uchepostgres",
  port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
});

/* =======================
   MIDDLEWARE
======================= */

// Use Helmet for security headers. During development we disable the
// contentSecurityPolicy so inline scripts and `onload` attributes (used
// for debugging) continue to work — in production CSP should be enabled.
const helmetOptions =
  process.env.NODE_ENV === "production" ? {} : { contentSecurityPolicy: false };
app.use(helmet(helmetOptions));
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Development request logger - helps confirm which files the browser requests
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    // only log static-ish requests for noise reduction
    if (
      req.url.startsWith("/styles") ||
      req.url.startsWith("/scripts") ||
      req.url.startsWith("/assets")
    ) {
      console.log(`[REQ] ${req.method} ${req.url}`);
    }
    next();
  });
}

/* =======================
   STATIC FRONTEND
======================= */

const frontendStaticDir = path.join(__dirname, "../frontend");
const isProd = process.env.NODE_ENV === "production";
const staticOptions = isProd
  ? { maxAge: "1d" }
  : {
      etag: false,
      maxAge: 0,
      setHeaders: (res) => {
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate"
        );
      },
    };

// Serve files at root (e.g. /styles/*, /scripts/*, /assets/*)
app.use(express.static(frontendStaticDir, staticOptions));
// Also support the `/frontend` prefix (some pages used that earlier)
app.use("/frontend", express.static(frontendStaticDir, staticOptions));

// Serve main HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendStaticDir, "body.html"));
});

/* =======================
   RATE LIMITING
======================= */

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use("/api/auth", authLimiter);

/* =======================
   AUTH HELPERS
======================= */

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  let token = null;

  if (auth && auth.startsWith("Bearer ")) {
    token = auth.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: "authorization required" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
}

/* =======================
   AUTH ROUTES
======================= */

// Admin login
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const token = jwt.sign({ user: ADMIN_USER, role: "admin" }, JWT_SECRET, {
    expiresIn: "1h",
  });

  res.json({ token });
});

// User login (PostgreSQL)
app.post("/api/auth/user-login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const { rows } = await pgClient.query(
      "SELECT * FROM users_pg WHERE username = $1",
      [username]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: "invalid username or password" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "invalid username or password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token });
  } catch (err) {
    console.error("user-login error:", err);
    res.status(500).json({ error: "server error" });
  }
});

/* =======================
   RESULTS ROUTES (PG ONLY)
======================= */

app.use("/uploads", express.static("uploads"));

app.use("/api/results", require("./routes/resultRoutes"));

app.post("/api/results", requireAuth, async (req, res) => {
  try {
    const results = req.body.results || req.body;
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: "results array required" });
    }

    for (const r of results) {
      await pgClient.query(
        `
        INSERT INTO results_pg (student, course_code, grade, unit)
        VALUES ($1,$2,$3,$4)
        `,
        [r.student, r.courseCode, r.grade, r.unit ? Number(r.unit) : null]
      );
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("POST /api/results error:", err);
    res.status(500).json({ error: "server error" });
  }
});

app.get("/api/results", async (req, res) => {
  try {
    const { rows } = await pgClient.query(
      "SELECT * FROM results_pg ORDER BY created_at DESC LIMIT 1000"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/results error:", err);
    res.status(500).json({ error: "server error" });
  }
});

/* =======================
   PAYSTACK ROUTES
======================= */

const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payments", paymentRoutes);

/* =======================
   START SERVER
======================= */
async function initPostgres() {
  try {
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS users_pg (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS courses_pg (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS results_pg (
        id SERIAL PRIMARY KEY,
        student TEXT NOT NULL,
        course_code TEXT NOT NULL,
        grade TEXT NOT NULL,
        unit INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);

    console.log("PostgreSQL tables created/checked.");
  } catch (err) {
    console.error("PostgreSQL init error:", err);
    throw err;
  }
}

(async function start() {
  try {
    await pgClient.connect();
    console.log("Connected to PostgreSQL");

    await initPostgres(); // ✅ creates tables

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
})();
