const { Checkin } = require("../models");
const { Op } = require("sequelize");

const avg = (arr) =>
  arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : 0;

const clamp01 = (n) => Math.max(0, Math.min(1, n));

exports.getReport = async (req, res) => {
  try {
    const days = Number(req.query.days || 7);
    const start = new Date();
    start.setDate(start.getDate() - days + 1);

    const checkins = await Checkin.findAll({
      where: {
        userId: req.user.id,
        date: { [Op.gte]: start.toISOString().slice(0, 10) },
      },
      order: [["date", "ASC"]],
    });

    const report = {
      totalDays: checkins.length,
      avgMood: avg(checkins.map((c) => c.moodScore)),
      avgStress: avg(checkins.map((c) => c.stressScore)),
      avgAnxiety: avg(checkins.map((c) => c.anxietyScore)),
      avgSleep: avg(checkins.map((c) => c.sleepScore)),
      avgEnergy: avg(checkins.map((c) => c.energyScore)),
      avgPhysical: avg(
        checkins.map((c) =>
          Array.isArray(c.physicalSymptoms) ? c.physicalSymptoms.length : 0
        )
      ),
      series: checkins.map((c) => ({
        date: c.date,
        mood: c.moodScore,
        stress: c.stressScore,
        anxiety: c.anxietyScore,
        sleep: c.sleepScore,
        energy: c.energyScore,
      })),
      latestInsight: checkins[checkins.length - 1]?.dailyInsight || "",
    };

    // Deterministic risk estimate (non-diagnostic).
    // Higher stress/anxiety + lower mood/sleep/energy increases the "risk" score.
    if (checkins.length === 0) {
      report.risk = null;
    } else {
      const lowMood = clamp01((5 - report.avgMood) / 5);
      const lowSleep = clamp01((5 - report.avgSleep) / 5);
      const lowEnergy = clamp01((5 - report.avgEnergy) / 5);
      const stress = clamp01(report.avgStress / 5);
      const anxiety = clamp01(report.avgAnxiety / 5);
      const physical = clamp01(report.avgPhysical / 3); // normalize up to ~3+ symptom tags

      const riskScore = Number(
        (
          stress * 0.25 +
          anxiety * 0.25 +
          lowMood * 0.15 +
          lowSleep * 0.20 +
          lowEnergy * 0.10 +
          physical * 0.05
        ).toFixed(2)
      );

      let level = "Low";
      if (riskScore >= 0.67) level = "High";
      else if (riskScore >= 0.34) level = "Moderate";

      const risk = { level, riskScore };
      if (level === "Low") {
        risk.summary =
          "You look relatively stable. Keep routines consistent to prevent stress from building up.";
        risk.recommendations = [
          "Maintain sleep timing + hydration.",
          "Do 10-20 minutes of light movement (walk/stretch) today or tomorrow.",
          "If anxiety spikes, try 2 minutes of slow breathing (inhale 4s, exhale 6s).",
        ];
        risk.whenToSeekHelp =
          "If symptoms worsen or persist for more than 2 weeks, consider speaking to a counsellor.";
      } else if (level === "Moderate") {
        risk.summary =
          "Stress and anxiety signals are noticeable. A small daily reset could help stabilize mood and sleep.";
        risk.recommendations = [
          "Use a 5-minute reset: breathe slowly, relax shoulders, then take a short walk.",
          "Reduce workload pressure: set one small achievable goal for the day.",
          "Track triggers (sleep loss, deadlines, social stress) for a few days to spot patterns.",
        ];
        risk.whenToSeekHelp =
          "If things don’t improve after a couple of weeks, or if functioning is getting harder, book a professional session.";
      } else {
        risk.summary =
          "Your recent check-ins suggest elevated stress. Getting timely support can make a difference.";
        risk.recommendations = [
          "Prioritize rest: protect sleep time and reduce intense tasks when possible.",
          "Try gentle movement (10 minutes) + breathing before sleep.",
          "Reach out to a counsellor/therapist; support is recommended rather than waiting it out.",
        ];
        risk.whenToSeekHelp =
          "If you feel unsafe or at risk of self-harm, seek emergency help immediately and contact local crisis services.";
      }

      report.risk = risk;
    }
    return res.json({ report });
  } catch {
    return res.status(500).json({ message: "Could not generate report" });
  }
};
