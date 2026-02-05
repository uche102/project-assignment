const express = require("express");
const router = express.Router();
const pgClient = require("../server").pgClient; // imports pgClient

// GET /api/results
router.get("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    if (!token)
      return res.status(401).json({ error: "authorization required" });

    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.id;

    const { rows } = await pgClient.query(
      "SELECT * FROM results_pg WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    res.json({ results: rows });
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

module.exports = router;
