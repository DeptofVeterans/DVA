const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const fs = require("fs");
const path = require("path");
const env = require("./config/env");
const { pool } = require("./config/database");

const authRoutes = require("./routes/auth.routes");
const lookupRoutes = require("./routes/lookups.routes");
const publicRoutes = require("./routes/public.routes");
const portalRoutes = require("./routes/portal.routes");
const requestRoutes = require("./routes/requests.routes");
const staffRoutes = require("./routes/staff.routes");
const adminRoutes = require("./routes/admin.routes");

[
  env.uploads.rootDir,
  env.uploads.privateDir,
  env.uploads.identityDir,
  env.uploads.requestDir,
  env.uploads.profileDir,
  env.uploads.galleryDir
].forEach((directory) => {
  fs.mkdirSync(path.resolve(process.cwd(), directory), { recursive: true });
});

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsAllowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin denied."));
    },
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      service: "JDF Veterans Affairs backend"
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/lookups", lookupRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin", adminRoutes);

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message = statusCode >= 500 ? "An unexpected server error occurred." : error.message;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    message,
    details: env.nodeEnv === "development" ? error.message : undefined
  });
});

app.listen(env.port, () => {
  console.log(`JDF Veterans Affairs backend listening on port ${env.port}`);
});
