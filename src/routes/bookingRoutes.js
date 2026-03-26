const express = require("express");
const auth = require("../middleware/auth");
const { requestBooking, getMyBookings } = require("../controllers/bookingController");

const router = express.Router();

router.post("/request", auth, requestBooking);
router.get("/", auth, getMyBookings);

module.exports = router;
