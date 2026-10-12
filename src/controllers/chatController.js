const { ChatLog } = require("../models");
const { safeChatReply } = require("../services/aiService");
const pdfParse = require("pdf-parse");

// Allowed MIME types
const IMAGE_TYPES = /^image\/(jpeg|png|gif|webp|bmp|svg\+xml)$/;
const PDF_TYPE = /^application\/pdf$/;
const TEXT_TYPES = /^text\//;

exports.chat = async (req, res) => {
  try {
    // When using multer + FormData, message comes as a text field
    const message = req.body.message;
    if (!message || typeof message !== "string" || message.trim().length < 2) {
      return res.status(400).json({ message: "Message must be at least 2 characters." });
    }
    if (message.length > 2000) {
      return res.status(400).json({ message: "Message must be at most 2000 characters." });
    }

    const file = req.file; // multer single("file")
    let contentParts = null;

    if (file) {
      const mime = file.mimetype || "";

      if (IMAGE_TYPES.test(mime)) {
        // ── Image: send as base64 image_url content part ──
        const base64 = file.buffer.toString("base64");
        const dataUrl = `data:${mime};base64,${base64}`;
        contentParts = [
          { type: "text", text: message },
          { type: "image_url", image_url: { url: dataUrl } },
        ];
        console.log(`[Chat] Image attached (${mime}, ${(file.size / 1024).toFixed(1)} KB)`);

      } else if (PDF_TYPE.test(mime)) {
        // ── PDF: extract text ──
        try {
          const parsed = await pdfParse(file.buffer);
          let extracted = (parsed.text || "").trim();
          if (!extracted) {
            return res.status(400).json({ message: "Could not extract text from the PDF. It may be scanned/image-only." });
          }
          if (extracted.length > 20_000) {
            extracted = extracted.slice(0, 20_000) + "\n\n[…truncated to 20,000 characters]";
          }
          contentParts = [
            { type: "text", text: `${message}\n\n--- Attached PDF content ---\n${extracted}` },
          ];
          console.log(`[Chat] PDF attached (${(file.size / 1024).toFixed(1)} KB, ${extracted.length} chars extracted)`);
        } catch (pdfErr) {
          console.error("[Chat] PDF parse error:", pdfErr.message);
          return res.status(400).json({ message: "Failed to read the PDF file." });
        }

      } else if (TEXT_TYPES.test(mime)) {
        // ── Text file: read as UTF-8 ──
        let text = file.buffer.toString("utf-8").trim();
        if (text.length > 20_000) {
          text = text.slice(0, 20_000) + "\n\n[…truncated to 20,000 characters]";
        }
        contentParts = [
          { type: "text", text: `${message}\n\n--- Attached file content ---\n${text}` },
        ];
        console.log(`[Chat] Text file attached (${(file.size / 1024).toFixed(1)} KB)`);

      } else {
        // ── Unsupported file type ──
        return res.status(400).json({
          message: `Unsupported file type (${mime}). Please upload an image, PDF, or text file.`,
        });
      }
    }

    const ai = await safeChatReply(message, contentParts);

    await ChatLog.create({
      userId: req.user.id,
      userMessage: message.slice(0, 500), // Don't store full messages for privacy
      assistantReply: ai.reply,
      safetyFlag: ai.safetyFlag,
    });

    return res.json(ai);
  } catch (err) {
    console.error("[Chat] Handler error:", err.message);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};
