// backend/routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const paystackController = require("../controllers/paystackController");

router.get("/verify/:reference", paystackController.verifyPayment);

module.exports = router;
