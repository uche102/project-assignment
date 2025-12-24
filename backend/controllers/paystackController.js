// backend/controllers/paystackController.js
const fetch = require("node-fetch"); // or native fetch in Node 18+
const pool = require("../db"); // PostgreSQL pool

const verifyPayment = async (req, res) => {
  const { reference } = req.params;

  try {
    // Verify payment with Paystack
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    const data = await response.json();

    if (!data.status || data.data.status !== "success") {
      return res.json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const { amount, currency, customer } = data.data;

    // Insert payment into database
    const query = `
      INSERT INTO payments (reference, email, amount, currency, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (reference) DO NOTHING
      RETURNING *;
    `;
    const values = [reference, customer.email, amount, currency, "success"];
    const result = await pool.query(query, values);

    res.json({ success: true, data: result.rows[0] || data.data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { verifyPayment };
