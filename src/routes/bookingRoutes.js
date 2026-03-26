const express = require("express");
const auth = require("../middleware/auth");
const { requestBooking } = require("../controllers/bookingController");

const router = express.Router();

router.post("/request", auth, requestBooking);

module.exports = router;
