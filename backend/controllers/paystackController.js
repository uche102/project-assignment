// backend/controllers/paystackController.js

const pool = require("../db");

/**
 * Verify a Paystack payment by reference
 */
const verifyPayment = async (req, res) => {
  const { reference } = req.params;

  try {
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
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    // Link payment to user if metadata contains user_id
    const userId = data.data.metadata?.user_id || null;

    // Insert payment into database
    const query = `
      INSERT INTO payments (reference, email, amount, currency, status, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (reference) DO NOTHING
      RETURNING *;
    `;
    const values = [
      reference,
      data.data.customer.email,
      data.data.amount / 100, // convert kobo to naira
      data.data.currency,
      data.data.status,
      userId,
    ];

    const result = await pool.query(query, values);

    return res.json({
      success: true,
      data: result.rows[0] || data.data,
    });
  } catch (err) {
    console.error("verifyPayment error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Get all payments for the currently authenticated user
 * Requires JWT middleware to set req.user
 */
const getMyPayments = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authorization required",
      });
    }

    const query = `
      SELECT 
        id,
        reference,
        amount,
        currency,
        status,
        created_at
      FROM payments
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(query, [userId]);

    return res.json({
      success: true,
      payments: rows,
    });
  } catch (err) {
    console.error("getMyPayments error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch payments",
    });
  }
};

module.exports = {
  verifyPayment,
  getMyPayments,
};
