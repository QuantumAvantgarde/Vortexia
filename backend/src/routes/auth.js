import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { querySystem, queryAsUser } from "../config/db.js";
import { validate } from "../middleware/validate.js";
import { loginRateLimiter, verifyCaptcha } from "../middleware/security.js";
import { toPublicUser } from "../utils/sanitize.js";

const router = Router();
const BCRYPT_ROUNDS = 12; // Measure 10: hash passwords (never store plaintext)
const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function setSessionCookie(res, user) {
  const token = jwt.sign({ sub: user.userid, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });

  // Measure 9: secure session cookies — httpOnly (no JS access, blocks XSS token theft),
  // secure (HTTPS only), sameSite=strict (blocks CSRF from cross-site requests), signed.
  res.cookie("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
    path: "/",
  });
}

router.post("/register", verifyCaptcha, validate("register"), asyncRoute(async (req, res) => {
  const { name, phoneNumber, password, role } = req.body;

  const existing = await querySystem("SELECT 1 FROM users WHERE phonenumber = $1", [phoneNumber]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: "An account with this phone number already exists." });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const userId = crypto.randomUUID();

  const result = await querySystem(
    `INSERT INTO users (userid, name, phonenumber, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING userid, name, role`,
    [userId, name, phoneNumber, passwordHash, role]
  );

  const user = result.rows[0];
  setSessionCookie(res, user);
  res.status(201).json({ user: toPublicUser(user) });
}));

router.post("/login", loginRateLimiter, verifyCaptcha, validate("login"), asyncRoute(async (req, res) => {
  const { phoneNumber, password } = req.body;

  const result = await querySystem(
    "SELECT userid, name, role, password_hash FROM users WHERE phonenumber = $1",
    [phoneNumber]
  );

  // Deliberately generic error + constant-ish shape so we don't leak whether the
  // phone number exists (prevents user enumeration).
  const genericError = { error: "Invalid phone number or password." };
  if (result.rowCount === 0) return res.status(401).json(genericError);

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json(genericError);

  setSessionCookie(res, user);
  res.json({ user: toPublicUser(user) });
}));

router.post("/logout", (req, res) => {
  res.clearCookie("session", { httpOnly: true, sameSite: "strict" });
  res.status(204).send();
});

export default router;
