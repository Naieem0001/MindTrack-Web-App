const express = require("express");
const auth = require("../middleware/auth");
const { getReport } = require("../controllers/reportController");

const router = express.Router();
router.get("/", auth, getReport);

module.exports = router;
