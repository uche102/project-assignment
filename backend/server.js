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


const PORT = Number(process.env.PORT) || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;


const frontendStaticDir = path.join(__dirname, "../frontend");
app.use(express.static(frontendStaticDir));


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


//PAYMENT ROUTES
app.get("/api/config/paystack", (req, res) => {
  res.json({ key: process.env.PAYSTACK_PUBLIC_KEY });
});


app.get("/api/payments/total/:regNo", requireAuth, async (req, res) => {
  try {
    const { regNo } = req.params;
    const result = await pgClient.query(
      "SELECT SUM(amount) as total FROM payments_pg WHERE student = $1",
      [regNo],
    );
    const total = result.rows[0].total || 0;
    res.json({ total: parseInt(total) });
  } catch (err) {
    console.error("Get Fees Error:", err);
    res.status(500).json({ error: "Could not fetch fees" });
  }
});


// ==========================================
// REAL PAYMENT VERIFICATION ROUTE
// ==========================================
app.post("/api/payments/save", requireAuth, async (req, res) => {
  console.log("...Starting Payment Verification...");

  try {
    const { reference, username } = req.body;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!reference || !username) {
      return res.status(400).json({ error: "Missing payment details" });
    }

    //  
    //  use  Secret Key here to be secure
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    const paystackData = await paystackResponse.json();

    // CHECK STATUS
    if (!paystackData.status || paystackData.data.status !== "success") {
      console.error("Paystack Verification Failed:", paystackData);
      return res.status(400).json({ error: "Payment verification failed" });
    }

    //  GET REAL AMOUNT
    const realAmount = paystackData.data.amount / 100;

    //  SAVE TO DATABASE
    await pgClient.query(
      "INSERT INTO payments_pg (student, reference, amount, status) VALUES ($1, $2, $3, 'success')",
      [username, reference, realAmount],
    );

    console.log(`Success! Verified payment of ₦${realAmount} for ${username}`);
    res.json({ message: "Payment verified and saved successfully" });
  } catch (err) {
    console.error("VERIFICATION ERROR:", err);

  
    if (err.code === "23505") {
      return res.json({ message: "Payment already recorded" });
    }

    res.status(500).json({ error: "Server error during verification" });
  }
});
//  LECTURER DIRECTORY

app.get("/api/lecturers", async (req, res) => {
  try {
    const query = `
      SELECT 
        l.id, l.name, l.email, l.office, l.image_url,
        COALESCE(
          json_agg(json_build_object('code', c.code, 'title', c.title)) FILTER (WHERE c.code IS NOT NULL), 
          '[]'
        ) as courses
      FROM lecturers_pg l
      LEFT JOIN courses_directory c ON l.id = c.lecturer_id
      GROUP BY l.id
      ORDER BY l.name ASC;
    `;
    const { rows } = await pgClient.query(query);
    res.json(rows);
  } catch (err) {
    console.error("Lecturer Fetch Error:", err);
    res.status(500).json({ error: "Could not fetch lecturers" });
  }
});

app.post("/api/admin/lecturers-upload", requireAuth, async (req, res) => {
  try {
    const { lecturers } = req.body;
    if (!Array.isArray(lecturers))
      return res.status(400).json({ error: "Invalid data" });

    await pgClient.query("BEGIN");
    for (const lec of lecturers) {
      await pgClient.query(
        "INSERT INTO lecturers_pg (name, email, office, courses) VALUES ($1, $2, $3, $4)",
        [lec.name, lec.email, lec.office, lec.courses],
      );
    }
    await pgClient.query("COMMIT");
    res.json({ message: `Uploaded ${lecturers.length} lecturers.` });
  } catch (err) {
    await pgClient.query("ROLLBACK");
    res.status(500).json({ error: "Upload failed" });
  }
});

/* =======================
   ADMIN: COURSE ASSIGNMENT
======================= */
app.get("/api/admin/courses", requireAuth, async (req, res) => {
  try {
    const { rows } = await pgClient.query(
      "SELECT * FROM courses_directory ORDER BY code ASC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch courses" });
  }
});

app.post("/api/admin/assign-course", requireAuth, async (req, res) => {
  try {
    const { course_code, lecturer_id } = req.body;
    await pgClient.query(
      "UPDATE courses_directory SET lecturer_id = $1 WHERE code = $2",
      [lecturer_id, course_code],
    );
    res.json({ message: "Course assigned successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/admin/add-course", requireAuth, async (req, res) => {
  const { code, title, unit, level } = req.body;
  try {
    const newCourse = await pgClient.query(
      `INSERT INTO courses_directory (code, title, unit, level)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [code, title, unit, level], // <--- Comma is fixed here
    );
    res.json({ message: "Course Created", course: newCourse.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =======================
   DASHBOARD STATS
======================= */
app.get("/api/dashboard/stats/:username", requireAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const resultsCount = await pgClient.query(
      "SELECT COUNT(*) FROM results_pg WHERE student = $1",
      [username],
    );
    const coursesCount = await pgClient.query(
      "SELECT COUNT(*) FROM registrations_pg WHERE student_username = $1",
      [username],
    );

    res.json({
      results: parseInt(resultsCount.rows[0].count),
      courses: parseInt(coursesCount.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch stats" });
  }
})
  // COURSE REGISTRATION ROUTES

app.post("/api/courses/register", requireAuth, async (req, res) => {
  try {
    const { course_code, course_title, units } = req.body;
    const { username } = req.user;

    const check = await pgClient.query(
      "SELECT * FROM registrations_pg WHERE student_username = $1 AND course_code = $2",
      [username, course_code],
    );
    if (check.rows.length > 0)
      return res.status(400).json({ error: "Already registered" });

    await pgClient.query(
      "INSERT INTO registrations_pg (student_username, course_code, course_title, units) VALUES ($1, $2, $3, $4)",
      [username, course_code, course_title, units],
    );
    res.json({ message: "Course registered successfully" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/api/courses/register", requireAuth, async (req, res) => {
  try {
    const { course_code } = req.body;
    const { username } = req.user;
    await pgClient.query(
      "DELETE FROM registrations_pg WHERE student_username = $1 AND course_code = $2",
      [username, course_code],
    );
    res.json({ message: "Course removed" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/courses/registered/:username", requireAuth, async (req, res) => {
  try {
    const { rows } = await pgClient.query(
      "SELECT * FROM registrations_pg WHERE student_username = $1",
      [req.params.username],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* =======================
   RESULTS ROUTES
======================= */
app.post("/api/results", requireAuth, async (req, res) => {
  try {
    const { student, course_code, grade, unit } = req.body;
    await pgClient.query(
      "INSERT INTO results_pg (student, course_code, grade, unit) VALUES ($1, $2, $3, $4)",
      [student, course_code, grade, unit],
    );
    res.json({ message: "Result saved" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/results/:regNo", requireAuth, async (req, res) => {
  try {
    const { rows } = await pgClient.query(
      "SELECT * FROM results_pg WHERE student = $1 ORDER BY created_at DESC",
      [req.params.regNo],
    );
    res.json({ results: rows });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch results" });
  }
});


app.post("/api/auth/user-login", async (req, res) => {
  try {
    const { reg_no, password } = req.body;
    const { rows } = await pgClient.query(
      "SELECT * FROM users_pg WHERE reg_no = $1",
      [reg_no],
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, reg_no: user.reg_no },
      JWT_SECRET,
      { expiresIn: "4h" },
    );
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/public-register", async (req, res) => {
  try {
    const { username, password, reg_no } = req.body;
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows } = await pgClient.query(
      "INSERT INTO users_pg (username, password_hash, reg_no) VALUES ($1, $2, $3) RETURNING id",
      [username, hash, reg_no],
    );
    res.json({ message: "User created", user: rows[0] });
  } catch (err) {
    if (err.code === "23505")
      return res.status(400).json({ error: "User exists" });
    res.status(500).json({ error: "Registration failed" });
  }
});

app.get("/", (req, res) =>
  res.sendFile(path.join(frontendStaticDir, "index.html")),
);

/* =======================
   POSTGRES START
======================= */
(async function start() {
  try {
    await pgClient.connect();
    
    console.log("Postgres Ready.");
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`),
    );
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
})();
