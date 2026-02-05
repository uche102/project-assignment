const express = require("express");
const router = express.Router();

const {
  verifyPayment,
  getMyPayments,
} = require("../controllers/paystackController");


// Verifies Paystack payment
router.get("/verify/:reference", verifyPayment);



module.exports = router;
