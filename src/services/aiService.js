const { GoogleGenerativeAI } = require("@google/generative-ai");

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

const fallbackDaily = () =>
  "You seem to be under pressure today. Try 5 minutes of deep breathing, a 10-minute walk, and proper hydration. If stress continues for several days, talk to a trusted person or professional.";

const fallbackChat =
  "I hear you. I am here for supportive suggestions, not diagnosis. Feel Free to Ask anything?";

exports.generateDailyInsight = async (payload) => {
  if (!process.env.GEMINI_API_KEY) return fallbackDaily();
  const client = getClient();
  try {
    const prompt = `User daily check-in: ${JSON.stringify(payload)}.
Give a short, safe, non-clinical response in 3-4 lines with:
1) supportive summary
2) 3 actionable tips
3) when to seek professional support.
No diagnosis.`;

    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text() || fallbackDaily();
  } catch (err) {
    const errorMsg = err?.message || "Unknown error";
    return fallbackDaily() + " (API Error: " + errorMsg + ")";
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

  if (!process.env.GEMINI_API_KEY) return { reply: fallbackChat, safetyFlag: false };
  const client = getClient();

  try {
    const model = client.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: "You are a mental wellness support bot. Keep answers safe, short, and practical. No diagnosis, no medicine advice.",
    });
    const result = await model.generateContent(message);
    return { reply: result.response.text() || fallbackChat, safetyFlag: false };
  } catch (err) {
    const errorMsg = err?.message || "Unknown error";
    return { reply: fallbackChat + "\n\n(API Error Diagnostics: " + errorMsg + ")", safetyFlag: false };
  }
};
