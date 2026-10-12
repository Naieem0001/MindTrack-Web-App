const { ChatLog } = require("../models");
const { safeChatReply } = require("../services/aiService");

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    const ai = await safeChatReply(message);

    await ChatLog.create({
      userId: req.user.id,
      userMessage: message,
      assistantReply: ai.reply,
      safetyFlag: ai.safetyFlag,
    });

    return res.json(ai);
  } catch {
    return res.status(500).json({ message: "Chat failed" });
  }
};
