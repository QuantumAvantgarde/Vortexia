import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { WebSocketServer } from "ws";
import http from "http";

import {
  securityHeaders,
  forceHttps,
  corsPolicy,
  preventParamPollution,
  apiRateLimiter,
} from "./middleware/security.js";
import authRoutes from "./routes/auth.js";
import bookingRoutes from "./routes/bookings.js";
import vehicleRoutes from "./routes/vehicles.js";

const app = express();

// --- Global security middleware, applied before any route logic ---
app.use(forceHttps);                       // Measure 19
app.use(securityHeaders);                  // Measure 18
app.use(corsPolicy);
app.use(preventParamPollution);
app.use(express.json({ limit: "50kb" }));  // small limit -> also blunts payload-flood abuse
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(apiRateLimiter);                   // Measure 11 (general), tighter one on /auth/login

// --- Routes ---
app.use("/auth", authRoutes);
app.use("/bookings", bookingRoutes);
app.use("/vehicles", vehicleRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Generic error handler — never leak stack traces or internals to the client.
app.use((err, req, res, next) => {
  console.error(err); // goes to server-side logs / Sentry, not the response
  res.status(500).json({ error: "Something went wrong." });
});

const server = http.createServer(app);

// --- Real-time layer (WebSockets) for live driver location + heatmap pushes ---
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws, req) => {
  // In production: authenticate this handshake using the same session cookie
  // (requireAuth-equivalent) before allowing the socket to join any room.
  ws.on("message", () => {
    /* relay validated, whitelisted location/booking events only */
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Vortexia API listening on :${PORT}`));

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
