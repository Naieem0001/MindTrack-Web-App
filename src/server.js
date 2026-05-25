require("dotenv").config({ quiet: true });
const express = require("express");
const path = require("path");
const https = require("https");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { sequelize } = require("./models");
const authRoutes = require("./routes/authRoutes");
const checkinRoutes = require("./routes/checkinRoutes");
const reportRoutes = require("./routes/reportRoutes");
const chatRoutes = require("./routes/chatRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const { startWeeklyDigestJob } = require("./jobs/weeklyDigestJob");

// ── Graceful unhandled rejection/exception handling ──────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("[Server] Unhandled promise rejection:", reason?.message || reason);
  // Don't exit — log only, so nodemon doesn't crash
});
process.on("uncaughtException", (err) => {
  console.error("[Server] Uncaught exception:", err.message);
  // Only exit for truly fatal errors
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 250 }));

app.use("/api/auth", authRoutes);
app.use("/api/checkins", checkinRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/bookings", bookingRoutes);
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

sequelize
  .sync({ alter: true })
  .then(() => {
    startWeeklyDigestJob();
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      const keepAlive = () => {
        https.get(process.env.RENDER_EXTERNAL_URL || 'https://your-app.onrender.com', (res) => {
          console.log(`Keep-alive ping: ${res.statusCode}`);
        }).on('error', (e) => {
          console.error('Ping failed:', e.message);
        });
      };

      // Ping every 10 minutes
      setInterval(keepAlive, 10 * 60 * 1000);
    });
  })
  .catch((err) => {
    console.error("DB init failed:", err.message);
    process.exit(1);
  });
