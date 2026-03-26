const cron = require("node-cron");
const { User, Checkin } = require("../models");

const startWeeklyDigestJob = () => {
  cron.schedule("0 8 * * 1", async () => {
    // Placeholder for queue/notification integration.
    const users = await User.findAll();
    for (const user of users) {
      await Checkin.count({ where: { userId: user.id } });
    }
  });
};

module.exports = { startWeeklyDigestJob };
