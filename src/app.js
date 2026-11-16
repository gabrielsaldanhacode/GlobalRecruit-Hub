
require("dotenv").config({ quiet: true });

const express = require("express");
const path = require("path");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);

const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const coachRoutes = require("./routes/coachRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const { securityHeaders, sameOrigin } = require("./middleware/security");

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters.");
}

const app = express();

// Required when using secure cookies behind Render's proxy.
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);
app.disable("x-powered-by");
app.use(securityHeaders);
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/api", sameOrigin);

app.use(express.json({ limit: "20kb" }));

app.use(
  session({
    name: "grh.sid",
    store: new PgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/coaches", coachRoutes);
app.use("/api/recruiting-pdf", pdfRoutes);

// Existing health-check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    application: "GlobalRecruit Hub",
    message: "API is running"
  });
});

// Existing frontend
app.use(express.static(path.join(__dirname, "../public")));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === "entity.too.large" ? 413 :
    error.type === "entity.parse.failed" ? 400 : 500;
  res.status(status).json({ error: status === 413 ? "Request body is too large." :
    status === 400 ? "Invalid JSON request." : "An unexpected error occurred." });
});

module.exports = app;
