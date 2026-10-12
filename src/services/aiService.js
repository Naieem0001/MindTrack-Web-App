const OpenAI = require("openai");

// ─── LLM CLIENT FACTORY ─────────────────────────────────────────────────
// Creates an OpenAI-compatible client for any provider.
function makeClient(baseURL, apiKey) {
  if (!baseURL || !apiKey) return null;
  return new OpenAI({ baseURL, apiKey, timeout: 30_000 });
}

// Lazy-init: created once on first call
let _primary = undefined;
let _fallback = undefined;

function getPrimary() {
  if (_primary === undefined) {
    _primary = makeClient(process.env.LLM_BASE_URL, process.env.LLM_API_KEY);
  }
  return _primary;
}

function getFallback() {
  if (_fallback === undefined) {
    _fallback = makeClient(
      process.env.FALLBACK_BASE_URL || "https://api.groq.com/openai/v1",
      process.env.FALLBACK_API_KEY || process.env.GROK_API_KEY
    );
  }
  return _fallback;
}

function getPrimaryModel() {
  return process.env.LLM_MODEL || "claude-opus-5.5";
}

function getFallbackModel() {
  return process.env.FALLBACK_MODEL || "openai/gpt-oss-120b";
}

// ─── RETRYABLE STATUS CODES ─────────────────────────────────────────────
const RETRY_STATUSES = new Set([401, 402, 429, 500, 502, 503, 504]);

function shouldFallback(err) {
  const status = err?.status || err?.response?.status;
  if (status && RETRY_STATUSES.has(status)) return true;
  // Timeout / network errors
  if (err?.code === "ETIMEDOUT" || err?.code === "ECONNABORTED") return true;
  if (err?.message?.toLowerCase().includes("timeout")) return true;
  return false;
}

// ─── CORE LLM CALL (with automatic fallback) ────────────────────────────
async function llmChat(messages, maxTokens = 600) {
  const primary = getPrimary();
  const fallback = getFallback();

  if (!primary && !fallback) {
    console.warn("[AI] No LLM provider configured (both primary and fallback keys missing)");
    return null;
  }

  // Try primary
  if (primary) {
    try {
      console.log(`[AI] Calling primary (${getPrimaryModel()})`);
      const res = await primary.chat.completions.create({
        model: getPrimaryModel(),
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      });
      const text = res.choices?.[0]?.message?.content;
      if (text) {
        console.log(`[AI] ✓ Primary success (${text.length} chars)`);
        return text;
      }
    } catch (err) {
      console.error(`[AI] Primary failed (${err.status || err.code || "unknown"}): ${(err.message || "").slice(0, 150)}`);
      if (!shouldFallback(err) || !fallback) throw err;
      console.log("[AI] Falling back to secondary provider...");
    }
  }

  // Try fallback
  if (fallback) {
    try {
      console.log(`[AI] Calling fallback (${getFallbackModel()})`);
      const res = await fallback.chat.completions.create({
        model: getFallbackModel(),
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      });
      const text = res.choices?.[0]?.message?.content;
      if (text) {
        console.log(`[AI] ✓ Fallback success (${text.length} chars)`);
        return text;
      }
    } catch (err) {
      console.error(`[AI] Fallback also failed (${err.status || err.code || "unknown"}): ${(err.message || "").slice(0, 150)}`);
      throw err;
    }
  }

  return null;
}

// ─── DAILY INSIGHT (called when user submits a check-in) ─────────────────
exports.generateDailyInsight = async (payload) => {
  if (!getPrimary() && !getFallback()) {
    console.warn("[AI] Skipping daily insight — no provider configured");
    return buildLocalInsight(payload);
  }

  try {
    const labels = { 1: "very low", 2: "low", 3: "moderate", 4: "good", 5: "excellent" };
    const mood = labels[payload.moodScore] || payload.moodScore;
    const stress = labels[payload.stressScore] || payload.stressScore;
    const energy = labels[payload.energyScore] || payload.energyScore;
    const sleep = labels[payload.sleepScore] || payload.sleepScore;

    const reply = await llmChat([
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
  if (!getPrimary() && !getFallback()) {
    console.warn("[AI] Skipping trend analysis — no provider configured");
    return buildLocalTrendAnalysis(reportData);
  }

  try {
    const { avgMood, avgStress, avgAnxiety, avgSleep, avgEnergy, totalDays, series, risk } = reportData;

    // Build a data summary for the AI
    const recent = (series || []).slice(-5).map(s =>
      `${s.date}: mood=${s.mood}, stress=${s.stress}, sleep=${s.sleep}, energy=${s.energy}`
    ).join('\n');

    const trendDirection = (series || []).length >= 3 ? detectTrend(series) : "insufficient data";

    const reply = await llmChat([
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

Give me a detailed analysis in this format with a good looking typography and font style/text style and format like using bullet points, emojis, and clear sections:
📊 OVERVIEW: [2-3 sentences summarizing overall state honestly — mention specific numbers]
📈 TRENDS: [What's improving vs declining — be specific with data]
⚠️ CONCERNS: [Any areas needing attention — be honest, reference actual scores]
✅ STRENGTHS: [What's going well — acknowledge positive areas in a poetical way ]
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

// ─── CHAT (supports optional file content parts) ─────────────────────────
exports.safeChatReply = async (message, contentParts = null) => {
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
        "🆘 Tele MANAS: 14416 (toll-free) Naieem Qureshi: naieemq111@gmail.com(gmail)\n" +
        "📞 iCall: 9152987821\n" +
        "📞 Vandrevala Foundation: 1860-2662-345\n\n" +
        "You are not alone, and things can get better with the right support, what you need is love 💙",
      safetyFlag: true,
    };
  }

  if (!getPrimary() && !getFallback()) {
    return { reply: "Hello, Lay your burdens here, Speak and let me walk beside your thoughts?", safetyFlag: false };
  }

  try {
    // Build the user content — plain text or multimodal content parts
    let userContent;
    if (contentParts && contentParts.length > 0) {
      // Multimodal: text + image_url / extracted file text
      userContent = contentParts;
    } else {
      userContent = message;
    }

    const reply = await llmChat([
      {
        role: "system",
        content:
          `You are MindTrack AI — a warm, thoughtful companion who genuinely cares. ` +
          `You can talk about anything the user wants: their day, feelings, relationships, work, hobbies, dreams, or just casual chat. ` +
          `Be natural, empathetic, and real — like a close friend who truly listens. ` +
          `Ask thoughtful follow-up questions when it feels right, but don't over-question. ` +
          `You can be playful, serious, philosophical, or comforting — match the user's energy. ` +
          `Keep responses concise but meaningful (a few sentences, more when the topic needs depth). ` +
          `\n\n` +
          `🛡️ Safety: If a user expresses thoughts of self-harm, suicide, or being in crisis, ` +
          `respond with genuine warmth and care. Gently encourage them to reach out to someone they trust ` +
          `or a local helpline. Never provide instructions that could cause harm.`
      },
      { role: "user", content: userContent },
    ], 500);

    return { reply: reply || "I hear you. Would you like to talk more about it?", safetyFlag: false };
  } catch (err) {
    console.error("[AI] Chat error:", err.message);
    return { reply: "I'm here to listen, speak freely and let me stand by your side. Could you tell me more about how your world is going?", safetyFlag: false };
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
