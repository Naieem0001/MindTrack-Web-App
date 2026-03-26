const { Checkin } = require("../models");
const { generateDailyInsight } = require("../services/aiService");

exports.createCheckin = async (req, res) => {
  try {
    const data = {
      ...req.body,
      userId: req.user.id,
      date: req.body.date || new Date().toISOString().slice(0, 10),
    };

    const insight = await generateDailyInsight(data);
    const checkin = await Checkin.create({ ...data, dailyInsight: insight });

    return res.status(201).json({ checkin });
  } catch {
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
