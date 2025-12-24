// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { Client } = require("pg");

const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

// Models (adjust paths if your models live elsewhere)
const Course = require("../models/Course");
const User = require("../models/User");
const Result = require("../models/Result");

const app = express();

// === Middleware ===
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// Serve frontend correctly
app.use(express.static(path.join(__dirname, "../frontend")));

// server.js
app.use(
  "/frontend/scripts",
  express.static(path.join(__dirname, "../frontend/scripts"))
);
app.use(
  "/frontend/styles",
  express.static(path.join(__dirname, "../frontend/styles"))
);
app.use(
  "/frontend/pages/partials",
  express.static(path.join(__dirname, "../frontend/pages/partials"))
);
// Serve frontend static files
app.use("/frontend", express.static(path.join(__dirname, "../frontend")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/partials/body.html"));
});

// CORS configuration
const clientDevOrigin = process.env.CLIENT_ORIGIN || "http://localhost:4000";
if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: true, credentials: true }));
} else {
  app.use(cors({ origin: clientDevOrigin, credentials: true }));
}

// === Config / env defaults ===
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/project-assignment";
const PORT = Number(process.env.PORT) || 4000; // used to match frontend examples
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const ADMIN_USER = process.env.ADMIN_USER || "uche";
const ADMIN_PASS = process.env.ADMIN_PASS || "unn123";
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

// === Postgres client ===
const pgClient = new Client({
  user: process.env.PG_USER || "postgres",
  host: process.env.PG_HOST || "localhost",
  database: process.env.PG_DATABASE || "pg_db",
  password: process.env.PG_PASSWORD || "uchepostgres",
  port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
});

// === Postgres init helper ===
async function initPostgres() {
  try {
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS users_pg (
        id SERIAL PRIMARY KEY,
        mongo_id TEXT,
        username TEXT,
        email TEXT,
        password_hash TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE (username),
        UNIQUE (mongo_id)
      );
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS courses_pg (
        id SERIAL PRIMARY KEY,
        mongo_id TEXT,
        name TEXT,
        code TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE (code),
        UNIQUE (mongo_id)
      );
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS results_pg (
        id SERIAL PRIMARY KEY,
        mongo_id TEXT,
        student TEXT,
        course_code TEXT,
        grade TEXT,
        unit INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE (mongo_id),
        UNIQUE (student, course_code, grade, unit)
      );
    `);

    console.log("PostgreSQL tables created/checked.");
  } catch (err) {
    console.error("initPostgres error:", err);
    throw err;
  }
}

// === Utility sanitizers ===
function safeText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}
function safeInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// === Sync Mongo -> Postgres ===
async function syncMongoToPostgres() {
  console.log("Starting MongoDB -> PostgreSQL sync...");
  try {
    // Users
    const users = await User.find().lean().exec();
    console.log(`Found ${users.length} users in MongoDB`);
    for (const u of users) {
      const mongoId = safeText(u._id);
      const username = safeText(u.username || "");
      const email = safeText(u.email || "");
      const passwordHash = safeText(u.passwordHash || u.password || "");

      const q = `
        INSERT INTO users_pg (mongo_id, username, email, password_hash)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (mongo_id) DO UPDATE
          SET username = EXCLUDED.username,
              email = EXCLUDED.email,
              password_hash = EXCLUDED.password_hash
      `;
      try {
        await pgClient.query(q, [mongoId, username, email, passwordHash]);
      } catch (e) {
        if (e && e.code) {
          console.warn("User row insert/update warning:", e.message);
        } else {
          throw e;
        }
      }
    }

    // Courses
    const courses = await Course.find().lean().exec();
    console.log(`Found ${courses.length} courses in MongoDB`);
    for (const c of courses) {
      const mongoId = safeText(c._id);
      const name = safeText(c.name || "");
      const code = safeText(c.code || "");

      const q = `
        INSERT INTO courses_pg (mongo_id, name, code)
        VALUES ($1, $2, $3)
        ON CONFLICT (mongo_id) DO UPDATE
          SET name = EXCLUDED.name,
              code = EXCLUDED.code
      `;
      await pgClient.query(q, [mongoId, name, code]);
    }

    // Results
    const results = await Result.find().lean().exec();
    console.log(`Found ${results.length} results in MongoDB`);
    for (const r of results) {
      const mongoId = safeText(r._id);
      const student = safeText(r.student || r.matric || r.id || "");
      const courseCode = safeText(r.courseCode || r.code || r.course || "");
      const grade = safeText(r.grade || r.result || "");
      const unit = safeInt(r.unit);

      const q = `
        INSERT INTO results_pg (mongo_id, student, course_code, grade, unit)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (mongo_id) DO NOTHING
      `;
      await pgClient.query(q, [mongoId, student, courseCode, grade, unit]);
    }

    console.log("MongoDB -> PostgreSQL sync finished.");
  } catch (err) {
    console.error("syncMongoToPostgres error:", err);
  }
}

// === Import Paystack routes ===
// Keep your existing filename. If you rename file to `routes/pay.js`, change path here.
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payments", paymentRoutes);

app.get("/verify-payment/:reference", async (req, res) => {
  const reference = req.params.reference;

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === Rate limiting ===
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  message: { error: "Too many login attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);
app.use("/api/auth/login", loginLimiter);

// === Basic routes & helpers ===
app.get("/", (req, res) => {
  res.send("Connected to MongoDB and PostgreSQL (see server logs).");
});

function requireAuth(req, res, next) {
  const auth = req.headers["authorization"];
  let token = null;
  if (auth) {
    const parts = auth.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") token = parts[1];
  }
  if (!token && req.cookies && req.cookies.token) token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "authorization required" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "invalid token" });
  }
}

// Auth endpoints (kept as you had them)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "username and password required" });
    if (username !== ADMIN_USER || password !== ADMIN_PASS)
      return res.status(401).json({ error: "invalid credentials" });
    const token = jwt.sign({ user: ADMIN_USER, role: "admin" }, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY || "1h",
    });
    res.json({ token });
  } catch (err) {
    console.error("POST /api/auth/login error", err);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/api/auth/user-login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "username and password required" });
    const user = await User.findOne({ username: String(username).trim() });
    if (!user)
      return res.status(401).json({ error: "invalid username or password" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res.status(401).json({ error: "invalid username or password" });
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || "2h" }
    );
    res.json({ token });
  } catch (err) {
    console.error("POST /api/auth/user-login error", err);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

// Results endpoints
app.post("/api/results", requireAuth, async (req, res) => {
  try {
    const payload = req.body.results || req.body;
    if (!payload || !Array.isArray(payload) || payload.length === 0)
      return res.status(400).json({ error: "results array required" });
    const docs = payload
      .map((r) => ({
        student: String(
          r.student || r.studentId || r.matric || r.id || ""
        ).trim(),
        courseCode: String(r.courseCode || r.code || r.course || "").trim(),
        grade: String(r.grade || r.result || "").trim(),
        unit: r.unit ? Number(r.unit) : undefined,
      }))
      .filter((d) => d.student && d.courseCode && d.grade);
    const inserted = await Result.insertMany(docs);
    res.status(201).json(inserted);
  } catch (err) {
    console.error("POST /api/results error", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/results", async (req, res) => {
  try {
    const items = await Result.find().sort({ createdAt: -1 }).limit(1000);
    res.json(items);
  } catch (err) {
    console.error("GET /api/results error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Test course endpoints
app.post("/api/test/course", async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code)
      return res.status(400).json({ error: "name and code required" });
    const c = await Course.create({ name, code });
    res.status(201).json(c);
  } catch (err) {
    console.error("POST /api/test/course error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/test/courses", async (req, res) => {
  try {
    const items = await Course.find().sort({ createdAt: -1 }).limit(100);
    res.json(items);
  } catch (err) {
    console.error("GET /api/test/courses error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Registration endpoints (kept)
app.post("/api/auth/register", async (req, res) => {
  try {
    const REGISTER_SECRET = process.env.REGISTER_SECRET || null;
    if (!REGISTER_SECRET)
      return res.status(403).json({
        error: "registration disabled: set REGISTER_SECRET to enable",
      });
    const provided = req.headers["x-register-secret"];
    if (!provided || provided !== REGISTER_SECRET)
      return res.status(403).json({ error: "forbidden" });
    const { username, password, email } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "username and password required" });
    const exists = await User.findOne({ username: String(username).trim() });
    if (exists)
      return res.status(409).json({ error: "username already exists" });
    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    const u = await User.create({
      username: String(username).trim(),
      email: email || "",
      passwordHash: hash,
    });
    res.status(201).json({ id: u._id, username: u.username });
  } catch (err) {
    console.error("POST /api/auth/register error", err);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/api/auth/public-register", async (req, res) => {
  try {
    const allowEnv = String(
      process.env.ALLOW_PUBLIC_REGISTER || ""
    ).toLowerCase();
    const isDev = process.env.NODE_ENV !== "production";
    const allowPublic = allowEnv === "true" || isDev;
    if (!allowPublic)
      return res.status(403).json({ error: "public registration disabled" });
    const { username, password, email } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "username and password required" });
    const exists = await User.findOne({ username: String(username).trim() });
    if (exists)
      return res.status(409).json({ error: "username already exists" });
    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    const u = await User.create({
      username: String(username).trim(),
      email: email || "",
      passwordHash: hash,
    });
    res
      .status(201)
      .json({ id: u._id, username: u.username, message: "account created" });
  } catch (err) {
    console.error("POST /api/auth/public-register error", err);
    res.status(500).json({ error: "server error", details: err.message });
  }
});

// Seed helper
async function seed() {
  try {
    const count = await Course.countDocuments();
    if (count === 0) {
      console.log("Seeding courses collection with sample data...");
      await Course.create({ name: "Mathematics I", code: "MTH101" });
      await Course.create({
        name: "Introduction to Programming",
        code: "CSC101",
      });
    }
  } catch (err) {
    console.error("seed error", err);
  }
}

// === Startup sequence ===
(async function startup() {
  try {
    // Connect to Postgres
    await pgClient.connect();
    console.log("Connected to PostgreSQL.");

    // Init Postgres tables
    await initPostgres();

    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log("MongoDB connected to", MONGO_URI);

    // Seed
    await seed();

    // Sync Mongo -> Postgres
    await syncMongoToPostgres();

    // Start server
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
})();
