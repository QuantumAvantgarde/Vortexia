// auth.js
// Measure 6: enforce ALL auth server-side. The frontend never decides who a user is —
// it only holds an httpOnly session cookie it cannot read or modify; every request is
// re-verified here against the JWT signature before any data is touched.
import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: "Not authenticated." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role }; // trusted, server-derived identity
    next();
  } catch {
    return res.status(401).json({ error: "Session expired or invalid." });
  }
}

// Role-based guard, e.g. requireRole("driver") or requireRole("admin")
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions." });
    }
    next();
  };
}

// Measure 8: block field tampering.
// Strips out any field a client should never be able to set directly (id, role,
// userID ownership, status, timestamps) so a passenger can't, e.g., POST
// { "status": "Completed", "passengerID": "someone-else" } to forge another
// user's booking. Combine with a per-route allow-list of the fields that ARE writable.
export function whitelistFields(allowedFields) {
  return (req, res, next) => {
    const clean = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        clean[field] = req.body[field];
      }
    }
    req.body = clean;
    next();
  };
}
