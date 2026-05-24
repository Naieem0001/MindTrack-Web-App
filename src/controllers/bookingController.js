const Joi = require("joi");
const { BookingRequest, User } = require("../models");
const { sendAppointmentNotification } = require("../services/emailService");

exports.requestBooking = async (req, res) => {
  try {
    const schema = Joi.object({
      requestType: Joi.string().valid("Counsellor", "Psychiatrist").required(),
      location: Joi.string().min(2).max(120).required(),
      phone: Joi.string().min(7).max(20).required(),
      preferredTime: Joi.string().max(80).optional().allow(""),
      message: Joi.string().max(2000).optional().allow(""),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "Validation failed", errors: [error.message] });
    }

    const booking = await BookingRequest.create({
      userId: req.user.id,
      requestType: value.requestType,
      location: value.location,
      phone: value.phone,
      preferredTime: value.preferredTime || null,
      message: value.message || null,
      status: "requested",
    });

    // Send email notification to admin
    const user = await User.findByPk(req.user.id);
    sendAppointmentNotification({
      booking: booking.toJSON(),
      userName: user?.name || "Unknown",
      userEmail: user?.email || "—",
    }).catch((err) => console.error("[Booking] Email notification error:", err.message));

    return res.status(201).json({ booking });
  } catch {
    return res.status(500).json({ message: "Could not create booking request" });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await BookingRequest.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    return res.json({ bookings });
  } catch {
    return res.status(500).json({ message: "Could not fetch bookings" });
  }
};
