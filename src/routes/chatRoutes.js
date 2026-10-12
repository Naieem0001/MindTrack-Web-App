const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth");
const { chat } = require("../controllers/chatController");

const router = express.Router();

// Multer: memory storage, 5 MB limit, single optional file field "file"
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single("file");

// Wrap multer to return a friendly error on size limit
const handleUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File too large. Maximum size is 5 MB." });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ message: "File upload failed." });
    }
    next();
  });
};

// POST /api/chat — auth required, optional file upload (FormData)
// Validation moved into chatController since body is now multipart
router.post("/", auth, handleUpload, chat);

module.exports = router;
