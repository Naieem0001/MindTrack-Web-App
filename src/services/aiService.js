const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Try primary model first, fall back if unavailable
const MODELS = ["llama-3.3-70b-versatile", "llama3-70b-8192", "mixtral-8x7b-32768"];

async function groqChat(messages, maxTokens = 600) {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    console.warn("[AI] GROK_API_KEY is not set in environment");
    return null;
  }

  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(`[AI] Trying model: ${model}`);
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`[AI] Groq ${res.status} with ${model}: ${body.slice(0, 200)}`);
        lastError = new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
        // If 401/403 (auth), no point trying other models
        if (res.status === 401 || res.status === 403) break;
        continue;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        console.log(`[AI] Success with model: ${model} (${text.length} chars)`);
        return text;
      }
    } catch (err) {
      console.error(`[AI] Fetch error with ${model}:`, err.message);
      lastError = err;
    }
  }

  if (lastError) throw lastError;
  return null;
}

// ─── DAILY INSIGHT (called when user submits a check-in) ─────────────────
exports.generateDailyInsight = async (payload) => {
  if (!process.env.GROK_API_KEY) {
    console.warn("[AI] Skipping daily insight — no API key");
    return buildLocalInsight(payload);
  }

  try {
    const labels = { 1: "very low", 2: "low", 3: "moderate", 4: "good", 5: "excellent" };
    const mood = labels[payload.moodScore] || payload.moodScore;
    const stress = labels[payload.stressScore] || payload.stressScore;
    const energy = labels[payload.energyScore] || payload.energyScore;
    const sleep = labels[payload.sleepScore] || payload.sleepScore;

    const reply = await groqChat([
      {
        role: "system",
        content: "You are a supportive wellness companion. Give short, practical, non-clinical feedback. Never diagnose. Be warm."
      },
      {
        role: "user",
        content: `My check-in today: Mood=${mood} (${payload.moodScore}/5), Stress=${stress} (${payload.stressScore}/5), Energy=${energy} (${payload.energyScore}/5), Sleep=${sleep} (${payload.sleepScore}/5), Anxiety=${payload.anxietyScore}/5.${payload.notes ? ' Notes: "' + payload.notes + '"' : ''}${payload.physicalSymptoms?.length ? ' Symptoms: ' + payload.physicalSymptoms.join(', ') : ''}

Respond in this exact format:
SUMMARY: [1 sentence — be specific about which scores are good vs concerning]
TIPS: [2-3 bullet tips specific to TODAY's data]
NOTE: [1 sentence on when to seek help, only if relevant]`
      },
    ]);

    return reply || buildLocalInsight(payload);
  } catch (err) {
    console.error("[AI] Daily insight error:", err.message);
    return buildLocalInsight(payload);
  }
};

// ─── TREND ANALYSIS (called for the trends/report page) ──────────────────
exports.generateTrendAnalysis = async (reportData) => {
  if (!process.env.GROK_API_KEY) {
    console.warn("[AI] Skipping trend analysis — no API key");
    return buildLocalTrendAnalysis(reportData);
  }

  try {
    const { avgMood, avgStress, avgAnxiety, avgSleep, avgEnergy, totalDays, series, risk } = reportData;

    // Build a data summary for the AI
    const recent = (series || []).slice(-5).map(s =>
      `${s.date}: mood=${s.mood}, stress=${s.stress}, sleep=${s.sleep}, energy=${s.energy}`
    ).join('\n');

    const trendDirection = (series || []).length >= 3 ? detectTrend(series) : "insufficient data";

    const reply = await groqChat([
      {
        role: "system",
        content: `You are a wellness data analyst in a mood tracking app. Provide honest, detailed analysis of the user's mental wellness trends. Be specific with numbers. Structure your response clearly. Never diagnose medical conditions. Reference actual data points. Be encouraging but truthful.`
      },
      {
        role: "user",
        content: `Analyze my wellness data from the last ${totalDays} days:

AVERAGES (scale 1-5):
- Mood: ${avgMood?.toFixed(2) || 'N/A'}/5
- Stress: ${avgStress?.toFixed(2) || 'N/A'}/5
- Anxiety: ${avgAnxiety?.toFixed(2) || 'N/A'}/5
- Sleep: ${avgSleep?.toFixed(2) || 'N/A'}/5
- Energy: ${avgEnergy?.toFixed(2) || 'N/A'}/5

RECENT ENTRIES:
${recent || 'No recent entries'}

TREND DIRECTION: ${trendDirection}
RISK LEVEL: ${risk?.level || 'N/A'} (score: ${risk?.riskScore?.toFixed(2) || 'N/A'})

Give me a detailed analysis in this format:
📊 OVERVIEW: [2-3 sentences summarizing overall state honestly — mention specific numbers]
📈 TRENDS: [What's improving vs declining — be specific with data]
⚠️ CONCERNS: [Any areas needing attention — be honest, reference actual scores]
✅ STRENGTHS: [What's going well — acknowledge positive areas]
💡 ACTION PLAN: [3-4 specific, actionable steps based on the data — not generic advice]
🔮 OUTLOOK: [1 sentence — what to focus on next based on trends]`
      },
    ], 800);

    return reply || buildLocalTrendAnalysis(reportData);
  } catch (err) {
    console.error("[AI] Trend analysis error:", err.message);
    return buildLocalTrendAnalysis(reportData);
  }
};

// ─── CHAT ────────────────────────────────────────────────────────────────
exports.safeChatReply = async (message) => {
  const crisisKeywords = [
    "suicide", "self-harm", "self harm", "kill myself", "i want to die",
    "i want die", "end my life", "hurt myself", "harm myself", "overdose",
    "end it", "can't go on", "cant go on", "not worth living",
  ];
  const lower = String(message || "").toLowerCase();
  const crisis = crisisKeywords.some((k) => lower.includes(k));

  if (crisis) {
    return {
      reply:
        "I'm really sorry you're feeling this way. Please reach out for help right away:\n\n" +
        "🆘 Tele MANAS: 14416 (toll-free)\n" +
        "📞 iCall: 9152987821\n" +
        "📞 Vandrevala Foundation: 1860-2662-345\n\n" +
        "You are not alone, and things can get better with the right support. 💙",
      safetyFlag: true,
    };
  }

  if (!process.env.GROK_API_KEY) return { reply: "I'm here for you. How can I help today?", safetyFlag: false };

  try {
    const reply = await groqChat([
      {
        role: "system",
        content:
          "You are a caring friend and supportive counselor. Respond in a warm, empathetic tone, keeping replies brief (2-3 sentences). Offer gentle advice, ask follow‑up questions, and never give medical diagnoses."
      },
      { role: "user", content: message },
    ], 200);

    return { reply: reply || "I hear you. Would you like to talk more about it?", safetyFlag: false };
  } catch (err) {
    console.error("[AI] Chat error:", err.message);
    return { reply: "I'm here to listen. Could you tell me more about how you're feeling?", safetyFlag: false };
  }
};

// ─── LOCAL FALLBACKS (when AI is unavailable) ────────────────────────────

function buildLocalInsight(p) {
  const parts = [];
  const m = p.moodScore, s = p.stressScore, sl = p.sleepScore, e = p.energyScore;

  if (m >= 4 && s <= 2) parts.push(`You're feeling ${m === 5 ? 'great' : 'good'} today with low stress — that's excellent!`);
  else if (m >= 4) parts.push(`Your mood is ${m === 5 ? 'excellent' : 'good'} (${m}/5), but stress is at ${s}/5 — keep an eye on it.`);
  else if (m <= 2) parts.push(`Your mood is low today (${m}/5). That's okay — rough days happen and you're still showing up.`);
  else parts.push(`Your mood is at ${m}/5 today — a mixed day.`);

  if (sl <= 2) parts.push(`Sleep quality is low (${sl}/5) — try limiting screens 1hr before bed tonight.`);
  else if (sl >= 4) parts.push(`Sleep is solid at ${sl}/5 — keep that routine going.`);

  if (e <= 2) parts.push(`Energy is low (${e}/5). Try a 10-min walk and stay hydrated.`);
  if (s >= 4) parts.push(`Stress is elevated (${s}/5). Take 5 slow deep breaths right now.`);

  if (s >= 4 && m <= 2) parts.push("If this pattern continues for 2+ weeks, consider talking to a counsellor.");

  return parts.join(' ');
}

function buildLocalTrendAnalysis(r) {
  const parts = [];
  parts.push(`📊 OVERVIEW: Over ${r.totalDays} days, your average mood is ${r.avgMood?.toFixed(1) || '?'}/5, stress ${r.avgStress?.toFixed(1) || '?'}/5, sleep ${r.avgSleep?.toFixed(1) || '?'}/5, and energy ${r.avgEnergy?.toFixed(1) || '?'}/5.`);

  if (r.avgMood >= 3.5) parts.push('📈 TRENDS: Your mood has been generally positive.');
  else if (r.avgMood < 2.5) parts.push('📈 TRENDS: Your mood has been consistently low — this deserves attention.');
  else parts.push('📈 TRENDS: Your mood has been fluctuating around the middle range.');

  if (r.avgStress >= 3.5) parts.push(`⚠️ CONCERNS: Stress averaging ${r.avgStress?.toFixed(1)}/5 is elevated. Consider daily stress-relief routines.`);
  if (r.avgSleep <= 2.5) parts.push(`⚠️ CONCERNS: Sleep quality at ${r.avgSleep?.toFixed(1)}/5 needs improvement.`);

  if (r.avgMood >= 3.5) parts.push('✅ STRENGTHS: Your mood resilience is a positive sign.');
  if (r.avgSleep >= 3.5) parts.push('✅ STRENGTHS: Good sleep quality supports everything else.');

  parts.push('💡 ACTION PLAN: 1) Track one trigger daily. 2) Add 10 min of movement. 3) Practice 2-min breathing before bed.');
  parts.push(`🔮 OUTLOOK: Focus on ${r.avgStress >= 3.5 ? 'stress reduction' : r.avgSleep <= 2.5 ? 'sleep hygiene' : 'maintaining your current routine'} this week.`);

  return parts.join('\n\n');
}

function detectTrend(series) {
  if (!series || series.length < 3) return "not enough data";
  const half = Math.floor(series.length / 2);
  const firstHalf = series.slice(0, half);
  const secondHalf = series.slice(half);

  const avg = (arr, key) => arr.reduce((s, x) => s + (x[key] || 0), 0) / arr.length;
  const moodDiff = avg(secondHalf, 'mood') - avg(firstHalf, 'mood');
  const stressDiff = avg(secondHalf, 'stress') - avg(firstHalf, 'stress');

  const parts = [];
  if (Math.abs(moodDiff) > 0.3) parts.push(`Mood ${moodDiff > 0 ? 'improving' : 'declining'} (${moodDiff > 0 ? '+' : ''}${moodDiff.toFixed(1)})`);
  if (Math.abs(stressDiff) > 0.3) parts.push(`Stress ${stressDiff > 0 ? 'increasing' : 'decreasing'} (${stressDiff > 0 ? '+' : ''}${stressDiff.toFixed(1)})`);

  return parts.length ? parts.join(', ') : 'relatively stable';
}
