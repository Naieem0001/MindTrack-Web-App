const { Checkin } = require("../models");
const { generateDailyInsight } = require("../services/aiService");

exports.createCheckin = async (req, res) => {
  try {
    const userId = req.user.id;
    const date = req.body.date || new Date().toISOString().slice(0, 10);
    const data = { ...req.body, userId, date };

    // Check if user already checked in today
    const existing = await Checkin.findOne({ where: { userId, date } });
    if (existing) {
      return res.status(400).json({ message: "Already checked in today. Please come back tomorrow with a smile 😊!" });
    }

    const insight = await generateDailyInsight(data);
    const checkin = await Checkin.create({ ...data, dailyInsight: insight });

    return res.status(201).json({ checkin });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Could not save check-in" });
  }
};


exports.listCheckins = async (req, res) => {
  try {
    const checkins = await Checkin.findAll({
      where: { userId: req.user.id },
      order: [["date", "ASC"]],
    });
    return res.json({ checkins });
  } catch {
    return res.status(500).json({ message: "Could not fetch check-ins" });
  }
};
