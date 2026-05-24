const cron = require("node-cron");
const { Op } = require("sequelize");
const { User, Checkin, ChatLog } = require("../models");

const startWeeklyDigestJob = () => {
  cron.schedule("0 8 * * 1", async () => {
    console.log("[WeeklyDigest] Starting weekly digest job...");
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().slice(0, 10);
    try {
      const users = await User.findAll();
      for (const user of users) {
        const checkins = await Checkin.findAll({
          where: { userId: user.id, date: { [Op.gte]: weekStr } },
        });
        const flagged = await ChatLog.count({
          where: { userId: user.id, safetyFlag: true, createdAt: { [Op.gte]: weekAgo } },
        });
        const avgMood = checkins.length
          ? Number((checkins.reduce((s, c) => s + c.moodScore, 0) / checkins.length).toFixed(2))
          : null;
        // TODO: Replace with email/push notification delivery
        console.log("[WeeklyDigest]", JSON.stringify({
          userId: user.id, email: user.email, week: weekStr,
          totalCheckins: checkins.length, avgMood, flaggedCount: flagged,
        }));
      }
      console.log("[WeeklyDigest] Done.");
    } catch (err) {
      console.error("[WeeklyDigest] Error:", err.message);
    }
  });
};

module.exports = { startWeeklyDigestJob };
