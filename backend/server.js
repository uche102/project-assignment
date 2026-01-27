require("dotenv").config();
const express = require("express");
const { Client } = require("pg");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");

const app = express();

/* =======================
   CONFIG
======================= */
const PORT = Number(process.env.PORT) || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

/* =======================
   STATIC FILES SETUP
======================= */
const frontendStaticDir = path.join(__dirname, "../frontend");
app.use(express.static(frontendStaticDir));

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
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

/* =======================
   AUTH HELPERS
======================= */
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  let token = null;

  if (auth && auth.startsWith("Bearer ")) token = auth.split(" ")[1];
  else if (req.cookies?.token) token = req.cookies.token;

  if (!token) return res.status(401).json({ error: "authorization required" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
}

/* =======================
   PAYMENT ROUTES
======================= */
app.get("/api/config/paystack", (req, res) => {
  res.json({ key: process.env.PAYSTACK_PUBLIC_KEY });
});

// Save Payment
app.post("/api/payments/save", requireAuth, async (req, res) => {
  try {
    const { reference, amount } = req.body;
    const { username } = req.user;

    const check = await pgClient.query(
      "SELECT * FROM payments_pg WHERE reference = $1",
      [reference],
    );
    if (check.rows.length > 0) {
      return res.json({ message: "Payment already recorded" });
    }

    // Note: payments_pg uses 'student', registrations_pg uses 'student_username'
    await pgClient.query(
      "INSERT INTO payments_pg (student, amount, reference, status) VALUES ($1, $2, $3, 'success')",
      [username, amount, reference],
    );

    res.json({ message: "Payment saved successfully" });
  } catch (err) {
    console.error("Payment Save Error:", err);
    res.status(500).json({ error: "Could not save payment" });
  }
});

// Get Total Fees
app.get("/api/payments/total/:username", requireAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pgClient.query(
      "SELECT SUM(amount) as total FROM payments_pg WHERE student = $1",
      [username],
    );
    const total = result.rows[0].total || 0;
    res.json({ total: parseInt(total) });
  } catch (err) {
    console.error("Get Fees Error:", err);
    res.status(500).json({ error: "Could not fetch fees" });
  }
});

/* =======================
   DASHBOARD STATS
======================= */
app.get("/api/dashboard/stats/:username", requireAuth, async (req, res) => {
  try {
    const { username } = req.params;

    // 1. Count Results (using 'student' column)
    const resultsCount = await pgClient.query(
      "SELECT COUNT(*) FROM results_pg WHERE student = $1",
      [username],
    );

    // 2. Count Courses (using 'student_username' column)
    const coursesCount = await pgClient.query(
      "SELECT COUNT(*) FROM registrations_pg WHERE student_username = $1",
      [username],
    );

    res.json({
      results: parseInt(resultsCount.rows[0].count),
      courses: parseInt(coursesCount.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch stats" });
  }
});

/* =======================
   COURSE REGISTRATION ROUTES
======================= */

// 1. REGISTER (Add Course)
app.post("/api/courses/register", requireAuth, async (req, res) => {
  try {
    const { course_code, course_title, units } = req.body;
    const { username } = req.user;

    // Check existing using 'student_username'
    const check = await pgClient.query(
      "SELECT * FROM registrations_pg WHERE student_username = $1 AND course_code = $2",
      [username, course_code],
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ error: "Course already registered" });
    }

    // Insert using 'student_username'
    await pgClient.query(
      "INSERT INTO registrations_pg (student_username, course_code, course_title, units) VALUES ($1, $2, $3, $4)",
      [username, course_code, course_title, units],
    );

    res.json({ message: "Course registered successfully" });
  } catch (err) {
    console.error("Reg Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 2. DELETE (Remove Course)
app.delete("/api/courses/register", requireAuth, async (req, res) => {
  try {
    const { course_code } = req.body;
    const { username } = req.user;

    await pgClient.query(
      "DELETE FROM registrations_pg WHERE student_username = $1 AND course_code = $2",
      [username, course_code],
    );

    res.json({ message: "Course removed successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 3. GET Registered Courses
app.get("/api/courses/registered/:username", requireAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { rows } = await pgClient.query(
      "SELECT * FROM registrations_pg WHERE student_username = $1",
      [username],
    );
    res.json(rows);
  } catch (err) {
    console.error("Get Courses Error:", err);
    res.status(500).json({ error: "Server error fetching courses" });
  }
});

/* =======================
   RESULTS ROUTES
======================= */
app.post("/api/results", requireAuth, async (req, res) => {
  try {
    const { student, course_code, grade, unit } = req.body;
    if (!student || !course_code || !grade || !unit) {
      return res.status(400).json({ error: "Missing fields" });
    }

    await pgClient.query(
      "INSERT INTO results_pg (student, course_code, grade, unit) VALUES ($1, $2, $3, $4)",
      [student, course_code, grade, unit],
    );

    res.json({ message: "Result saved successfully" });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/results/:studentId", requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { rows } = await pgClient.query(
      "SELECT * FROM results_pg WHERE student = $1 ORDER BY created_at DESC",
      [studentId],
    );
    res.json({ results: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch results" });
  }
});

app.get("/api/results/count/:username", requireAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { rows } = await pgClient.query(
      "SELECT COUNT(*) FROM results_pg WHERE student = $1",
      [username],
    );
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) {
    console.error("Count Error:", err);
    res.status(500).json({ error: "Error counting results" });
  }
});

/* =======================
   AUTH ROUTES
======================= */
app.post("/api/auth/user-login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const { rows } = await pgClient.query(
      "SELECT * FROM users_pg WHERE username = $1",
      [username],
    );
    const user = rows[0];

    if (!user)
      return res.status(401).json({ error: "invalid username or password" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ error: "invalid username or password" });

    // Include reg_no in the sign method payload
    const token = jwt.sign(
      { id: user.id, username: user.username, reg_no: user.reg_no },
      JWT_SECRET,
      { expiresIn: "2h" },
    );

    res.json({ token });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/api/auth/public-register", async (req, res) => {
  try {
    const { username, password, reg_no } = req.body; // Add reg_no here
    if (!username || !password || !reg_no)
      // Ensure it is required
      return res.status(400).json({ error: "All fields required" });

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Update the INSERT statement
    const { rows } = await pgClient.query(
      "INSERT INTO users_pg (username, password_hash, reg_no) VALUES ($1, $2, $3) RETURNING id, username, reg_no",
      [username, hash, reg_no],
    );

    res.json({ message: "User created", user: rows[0] });
  } catch (err) {
    console.error("register error:", err);
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ error: "Username or Reg Number already exists." });
    }
    res.status(500).json({ error: "Database error during registration." });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendStaticDir, "index.html"));
});

/* =======================
   POSTGRES INIT & START
======================= */
(async function start() {
  try {
    await pgClient.connect();

    // Tables
    await pgClient.query(`
CREATE TABLE IF NOT EXISTS users_pg (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    reg_no TEXT UNIQUE, -- Add this line
    password_hash TEXT NOT NULL,
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

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS registrations_pg (
        id SERIAL PRIMARY KEY,
        student_username TEXT NOT NULL,
        course_code TEXT NOT NULL,
        course_title TEXT,
        units INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS payments_pg (
        id SERIAL PRIMARY KEY,
        student TEXT NOT NULL, 
        reference TEXT UNIQUE NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'success',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);

    console.log("Postgres Database & Tables Ready.");
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`),
    );
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
})();
