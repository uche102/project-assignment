// backend/db.js
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "postgres", // your PostgreSQL username
  host: process.env.DB_HOST || "localhost", // usually localhost
  database: process.env.DB_NAME || "pg_db", // your database name
  password: process.env.DB_PASS || "uchepostgres", // your password
  port: process.env.DB_PORT || 5432, // default PostgreSQL port
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL");
});

module.exports = pool;
