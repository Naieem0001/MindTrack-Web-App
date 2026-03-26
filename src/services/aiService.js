const OpenAI = require("openai");

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

const fallbackDaily = () =>
  "You seem to be under pressure today. Try 5 minutes of deep breathing, a 10-minute walk, and proper hydration. If stress continues for several days, talk to a trusted person or professional.";

const fallbackChat =
  "I hear you. I am here for supportive suggestions, not diagnosis. Can you share if your stress is mostly from sleep, workload, relationships, or health routines?";

exports.generateDailyInsight = async (payload) => {
  if (!process.env.OPENAI_API_KEY) return fallbackDaily();
  const client = getClient();
  try {
    const prompt = `User daily check-in: ${JSON.stringify(payload)}.
Give a short, safe, non-clinical response in 3-4 lines with:
1) supportive summary
2) 3 actionable tips
3) when to seek professional support.
No diagnosis.`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      max_output_tokens: 220,
    });
    return response.output_text || fallbackDaily();
  } catch {
    return fallbackDaily();
  }
};

exports.safeChatReply = async (message) => {
  const crisisKeywords = [
    "suicide",
    "self-harm",
    "self harm",
    "kill myself",
    "i want to die",
    "i want die",
    "end my life",
    "hurt myself",
    "harm myself",
    "overdose",
    "end it",
    "can't go on",
    "cant go on",
    "not worth living",
  ];
  const lower = String(message || "").toLowerCase();
  const crisis = crisisKeywords.some((k) => lower.includes(k));

  if (crisis) {
    return {
      reply:
        "I am really sorry you are feeling this way. Please contact emergency services or a trusted person immediately. If you are in India, call Tele MANAS 14416 or 1-800-891-4416. You are not alone.",
      safetyFlag: true,
    };
  }

  if (!process.env.OPENAI_API_KEY) return { reply: fallbackChat, safetyFlag: false };
  const client = getClient();

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `You are a mental wellness support bot. Keep answers safe, short, and practical.
No diagnosis, no medicine advice. User message: ${message}`,
      max_output_tokens: 220,
    });
    return { reply: response.output_text || fallbackChat, safetyFlag: false };
  } catch {
    return { reply: fallbackChat, safetyFlag: false };
  }
};
