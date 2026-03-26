const Joi = require("joi");
const { BookingRequest } = require("../models");

exports.requestBooking = async (req, res) => {
  try {
    const schema = Joi.object({
      requestType: Joi.string().valid("Counsellor", "Psychiatrist").required(),
      location: Joi.string().min(2).max(120).required(),
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
      preferredTime: value.preferredTime || null,
      message: value.message || null,
      status: "requested",
    });

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

