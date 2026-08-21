// security.js — cross-cutting security middleware applied to every request.
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import hpp from "hpp";

// Measure 18: security headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS, etc.)
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://*.googleapis.com", "https://*.gstatic.com", "https://images.unsplash.com"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "wss:"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
});

// Measure 19: force HTTPS. In production, terminate TLS at the load balancer/reverse proxy
// (e.g. behind AWS ALB / Render) and redirect any plain-HTTP request here.
export function forceHttps(req, res, next) {
  const proto = req.headers["x-forwarded-proto"];
  if (process.env.NODE_ENV === "production" && proto && proto !== "https") {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
}

// Restrict cross-origin access to the known frontend origin only.
export const corsPolicy = cors({
  origin: process.env.ALLOWED_ORIGIN || "export const corsPolicy = cors({
  origin: process.env.ALLOWED_ORIGIN || "https://main.d1atmd95seexy0.amplifyapp.com",
  credentials: true, 
  methods: ["GET", "POST", "PATCH", "DELETE"],
});",
  credentials: true, // required so the httpOnly session cookie is sent
  methods: ["GET", "POST", "PATCH", "DELETE"],
});

// Measure 20 pairing: hpp blocks HTTP parameter-pollution attacks (?role=passenger&role=admin)
export const preventParamPollution = hpp();

// Measure 11: rate limit login/auth endpoints specifically (tighter than general API limit).
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in a few minutes." },
});

// General API rate limit — protects booking/heatmap endpoints from abuse/scraping.
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

// Measure 12: lightweight bot protection.
// Verifies a Google reCAPTCHA/hCaptcha token sent by the frontend on sensitive
// actions (register, login, booking). The secret key never leaves the server.
export async function verifyCaptcha(req, res, next) {
  const token = req.body?.captchaToken;
  if (!token) return res.status(400).json({ error: "Missing captcha token." });

  // The frontend uses a placeholder token until a real widget is configured.
  // Never allow this fallback outside local development.
  if (process.env.NODE_ENV !== "production" && process.env.RECAPTCHA_SECRET_KEY === "CHANGE_ME") {
    return next();
  }

  try {
    const params = new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: token,
    });
    const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      body: params,
    });
    const data = await resp.json();
    if (!data.success || (data.score !== undefined && data.score < 0.5)) {
      return res.status(403).json({ error: "Bot verification failed." });
    }
    next();
  } catch {
    return res.status(503).json({ error: "Verification service unavailable." });
  }
}
