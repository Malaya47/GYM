import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import membershipRoutes from "./routes/membership";
import shopRoutes from "./routes/shop";
import adminRoutes from "./routes/admin";
import contentRoutes from "./routes/content";
import uploadRoutes from "./routes/upload";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ─────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// ─── Health Check ───────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "GYM API is running" });
});

// ─── Routes ─────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/upload", uploadRoutes);

// ─── 404 Handler ────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global Error Handler ───────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
  },
);

// Only start the HTTP server in non-serverless environments
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 GYM API running on http://localhost:${PORT}`);
  });
}

export default app;
