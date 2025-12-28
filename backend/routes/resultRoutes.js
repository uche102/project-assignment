const express = require("express");
const router = express.Router();

const uploadResult = require("../middleware/uploadResult");
const {
  uploadResult: uploadResultController,
} = require("../controllers/resultController");

router.post(
  "/upload",
  uploadResult.single("resultFile"),
  uploadResultController
);

module.exports = router;
