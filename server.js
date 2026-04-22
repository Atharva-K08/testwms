"use strict";

require("dotenv").config();
require("express-async-errors");

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { connectDB } = require("./src/config/database");
const {
  errorHandler,
  notFoundHandler,
} = require("./src/middlewares/error.middleware");
const { httpLogger, logger } = require("./src/utils/logger.util");

// Route imports
const authRoutes = require("./src/routes/auth.routes");
const requestRoutes = require("./src/routes/request.routes");
const queueRoutes = require("./src/routes/queue.routes");
const receiptRoutes = require("./src/routes/receipt.routes");
const dieselFillingRoutes = require("./src/routes/dieselFilling.routes");
const driverRoutes = require("./src/routes/driver.routes");
const routeRoutes = require("./src/routes/route.routes");
const attendanceRoutes = require("./src/routes/attendance.routes");
const tankerRoutes = require("./src/routes/tanker.routes");

const app = express();

// ── Security Middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({ origin: "*", methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] }),
);

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use("/api/", limiter);

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── HTTP Request Logging ──────────────────────────────────────────────────────
app.use(
  morgan("combined", {
    stream: { write: (msg) => httpLogger.info(msg.trim()) },
  }),
);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/requests", requestRoutes);
app.use("/api/v1/queue", queueRoutes);
app.use("/api/v1/receipts", receiptRoutes);
app.use("/api/v1/diesel-fillings", dieselFillingRoutes);
app.use("/api/v1/drivers", driverRoutes);
app.use("/api/v1/routes", routeRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/tankers", tankerRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Database Connection & Server Start ────────────────────────────────────────
const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(
      `Server running on ${process.env.NODE_ENV} mode on port ${PORT}`,
    );
  });
})();

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
process.on("unhandledRejection", (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;
