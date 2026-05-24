const { Checkin } = require("../models");
const { Op } = require("sequelize");
const { generateTrendAnalysis } = require("../services/aiService");

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
      avgSocial: avg(checkins.map((c) => c.socialScore || 3)),
      avgFocus: avg(checkins.map((c) => c.focusScore || 3)),
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
        social: c.socialScore || 3,
        focus: c.focusScore || 3,
      })),
      latestInsight: checkins[checkins.length - 1]?.dailyInsight || "",
    };

    // ─── RISK CALCULATION ────────────────────────────────────────────
    if (checkins.length === 0) {
      report.risk = null;
    } else {
      const lowMood = clamp01((5 - report.avgMood) / 5);
      const lowSleep = clamp01((5 - report.avgSleep) / 5);
      const lowEnergy = clamp01((5 - report.avgEnergy) / 5);
      const lowSocial = clamp01((5 - report.avgSocial) / 5);
      const lowFocus = clamp01((5 - report.avgFocus) / 5);
      const stress = clamp01(report.avgStress / 5);
      const anxiety = clamp01(report.avgAnxiety / 5);
      const physical = clamp01(report.avgPhysical / 3);

      const riskScore = Number(
        (
          stress * 0.20 +
          anxiety * 0.20 +
          lowMood * 0.15 +
          lowSleep * 0.15 +
          lowEnergy * 0.10 +
          lowSocial * 0.08 +
          lowFocus * 0.07 +
          physical * 0.05
        ).toFixed(2)
      );

      let level = "Low";
      if (riskScore >= 0.67) level = "High";
      else if (riskScore >= 0.34) level = "Moderate";

      // ─── DATA-SPECIFIC RECOMMENDATIONS ─────────────────────────────
      const risk = { level, riskScore };

      // Build personalized summary with actual numbers
      risk.summary = buildPersonalizedSummary(report, level, riskScore);

      // Build specific recommendations based on which scores are worst
      risk.recommendations = buildDataDrivenRecommendations(report);

      // When to seek help — tied to actual data
      risk.whenToSeekHelp = buildSeekHelpNote(report, level);

      // Factor breakdown for transparency
      risk.factors = {
        stressContribution: (stress * 0.20).toFixed(3),
        anxietyContribution: (anxiety * 0.20).toFixed(3),
        lowSleepContribution: (lowSleep * 0.15).toFixed(3),
        lowMoodContribution: (lowMood * 0.15).toFixed(3),
        lowEnergyContribution: (lowEnergy * 0.10).toFixed(3),
        lowSocialContribution: (lowSocial * 0.08).toFixed(3),
        lowFocusContribution: (lowFocus * 0.07).toFixed(3),
        physicalContribution: (physical * 0.05).toFixed(3),
      };

      report.risk = risk;
    }

    // ─── AI TREND ANALYSIS ───────────────────────────────────────────
    // Generate a comprehensive AI-powered analysis of the trend data
    if (checkins.length >= 1) {
      try {
        report.trendAnalysis = await generateTrendAnalysis(report);
      } catch (err) {
        console.error("[Report] AI trend analysis failed:", err.message);
        report.trendAnalysis = null;
      }
    }

    return res.json({ report });
  } catch (err) {
    console.error("[Report] Error:", err);
    return res.status(500).json({ message: "Could not generate report" });
  }
};

// ─── HELPER: Personalized summary with real numbers ──────────────────────
function buildPersonalizedSummary(r, level, score) {
  const parts = [];

  parts.push(`Over your last ${r.totalDays} check-in${r.totalDays > 1 ? 's' : ''}, your wellness score is ${score.toFixed(2)}/1.00 (${level} risk).`);

  // Highlight the top concern
  const concerns = [];
  if (r.avgStress >= 3.5) concerns.push(`high stress (${r.avgStress.toFixed(1)}/5)`);
  if (r.avgAnxiety >= 3.5) concerns.push(`elevated anxiety (${r.avgAnxiety.toFixed(1)}/5)`);
  if (r.avgSleep <= 2.5) concerns.push(`poor sleep (${r.avgSleep.toFixed(1)}/5)`);
  if (r.avgMood <= 2.5) concerns.push(`low mood (${r.avgMood.toFixed(1)}/5)`);
  if (r.avgEnergy <= 2.5) concerns.push(`low energy (${r.avgEnergy.toFixed(1)}/5)`);
  if (r.avgSocial <= 2.5) concerns.push(`low social connection (${r.avgSocial.toFixed(1)}/5)`);
  if (r.avgFocus <= 2.5) concerns.push(`poor focus (${r.avgFocus.toFixed(1)}/5)`);

  if (concerns.length > 0) {
    parts.push(`Key areas of concern: ${concerns.join(', ')}.`);
  }

  // Highlight positives
  const positives = [];
  if (r.avgMood >= 3.5) positives.push(`mood (${r.avgMood.toFixed(1)}/5)`);
  if (r.avgSleep >= 3.5) positives.push(`sleep (${r.avgSleep.toFixed(1)}/5)`);
  if (r.avgEnergy >= 3.5) positives.push(`energy (${r.avgEnergy.toFixed(1)}/5)`);
  if (r.avgSocial >= 3.5) positives.push(`social connection (${r.avgSocial.toFixed(1)}/5)`);
  if (r.avgFocus >= 3.5) positives.push(`focus (${r.avgFocus.toFixed(1)}/5)`);
  if (r.avgStress <= 2.5) positives.push(`low stress (${r.avgStress.toFixed(1)}/5)`);

  if (positives.length > 0) {
    parts.push(`Going well: ${positives.join(', ')}.`);
  }

  return parts.join(' ');
}

// ─── HELPER: Data-driven recommendations ─────────────────────────────────
function buildDataDrivenRecommendations(r) {
  const recs = [];

  // Prioritize by worst scores
  const issues = [
    { area: 'stress', val: r.avgStress, threshold: 3 },
    { area: 'anxiety', val: r.avgAnxiety, threshold: 3 },
    { area: 'sleep', val: r.avgSleep, threshold: 3, inverted: true },
    { area: 'mood', val: r.avgMood, threshold: 3, inverted: true },
    { area: 'energy', val: r.avgEnergy, threshold: 3, inverted: true },
    { area: 'social', val: r.avgSocial, threshold: 3, inverted: true },
    { area: 'focus', val: r.avgFocus, threshold: 3, inverted: true },
  ].sort((a, b) => {
    const scoreA = a.inverted ? (5 - a.val) : a.val;
    const scoreB = b.inverted ? (5 - b.val) : b.val;
    return scoreB - scoreA; // worst first
  });

  for (const issue of issues.slice(0, 4)) {
    switch (issue.area) {
      case 'stress':
        if (issue.val >= 4) recs.push(`Your stress is high at ${issue.val.toFixed(1)}/5. Try box breathing (4s inhale, 4s hold, 4s exhale, 4s hold) 3 times today. Identify your top stressor and write it down.`);
        else if (issue.val >= 3) recs.push(`Stress at ${issue.val.toFixed(1)}/5 — noticeable but manageable. Take a 5-minute break every 90 minutes and do shoulder rolls.`);
        else recs.push(`Stress is well-managed at ${issue.val.toFixed(1)}/5 — maintain your current coping strategies.`);
        break;
      case 'anxiety':
        if (issue.val >= 4) recs.push(`Anxiety is elevated at ${issue.val.toFixed(1)}/5. Try grounding: name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste. Reduce caffeine.`);
        else if (issue.val >= 3) recs.push(`Anxiety at ${issue.val.toFixed(1)}/5 — try journaling for 5 minutes to externalize worrying thoughts.`);
        else recs.push(`Anxiety is low at ${issue.val.toFixed(1)}/5 — a positive sign of emotional stability.`);
        break;
      case 'sleep':
        if (issue.val <= 2) recs.push(`Sleep quality is poor at ${issue.val.toFixed(1)}/5. Set a fixed bedtime, avoid screens 1hr before bed, and keep the room cool and dark.`);
        else if (issue.val <= 3) recs.push(`Sleep at ${issue.val.toFixed(1)}/5 could improve. Try a consistent wake time and avoid heavy meals 2hrs before bed.`);
        else recs.push(`Sleep quality at ${issue.val.toFixed(1)}/5 is solid — this supports mood and energy recovery.`);
        break;
      case 'mood':
        if (issue.val <= 2) recs.push(`Mood is low at ${issue.val.toFixed(1)}/5. Schedule one small enjoyable activity today (walk, music, cooking). Connection helps — reach out to someone you trust.`);
        else if (issue.val <= 3) recs.push(`Mood at ${issue.val.toFixed(1)}/5 is middling. Try a gratitude practice: write 3 good things from today before bed.`);
        else recs.push(`Mood at ${issue.val.toFixed(1)}/5 is positive — nurture it with things that bring you joy.`);
        break;
      case 'energy':
        if (issue.val <= 2) recs.push(`Energy is low at ${issue.val.toFixed(1)}/5. Prioritize hydration (8 glasses), a 10-min walk, and avoid sugar crashes from processed foods.`);
        else if (issue.val <= 3) recs.push(`Energy at ${issue.val.toFixed(1)}/5 — try a short walk after lunch and ensure you're eating enough protein.`);
        else recs.push(`Energy at ${issue.val.toFixed(1)}/5 is good — use it wisely on your most important tasks.`);
        break;
      case 'social':
        if (issue.val <= 2) recs.push(`Social connection is low at ${issue.val.toFixed(1)}/5. Isolation can amplify stress. Try reaching out to one person today — even a short text or call counts.`);
        else if (issue.val <= 3) recs.push(`Social connection at ${issue.val.toFixed(1)}/5 — consider scheduling a brief catch-up with a friend or family member this week.`);
        else recs.push(`Social connection at ${issue.val.toFixed(1)}/5 is healthy — relationships are a core pillar of wellbeing.`);
        break;
      case 'focus':
        if (issue.val <= 2) recs.push(`Focus is poor at ${issue.val.toFixed(1)}/5. Try the Pomodoro technique (25 min work, 5 min break). Reduce multitasking and close unnecessary tabs.`);
        else if (issue.val <= 3) recs.push(`Focus at ${issue.val.toFixed(1)}/5 — try working in dedicated blocks without distractions. Even 15 focused minutes helps.`);
        else recs.push(`Focus at ${issue.val.toFixed(1)}/5 is solid — mental clarity supports productivity and mood.`);
        break;
    }
  }

  return recs;
}

// ─── HELPER: When to seek help ───────────────────────────────────────────
function buildSeekHelpNote(r, level) {
  if (level === "High") {
    return `Your risk score is in the High range. With mood at ${r.avgMood.toFixed(1)}/5 and stress at ${r.avgStress.toFixed(1)}/5, professional support is recommended. Please consider booking a session with a counsellor or therapist — you deserve the right help.`;
  }
  if (level === "Moderate") {
    return `If your mood stays below 3/5 or stress stays above 3/5 for more than 2 weeks, consider speaking to a professional. Early support makes a real difference.`;
  }
  return `You're in a stable range. If you notice sustained changes (low mood, sleep disruption, rising stress for 2+ weeks), that's a good time to check in with a counsellor.`;
}
