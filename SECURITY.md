# Security measures — implementation map

| # | Measure | Where it lives |
|---|---|---|
| 1 | Hide API keys | All secrets (`JWT_SECRET`, `RECAPTCHA_SECRET_KEY`, `GOOGLE_MAPS_SERVER_KEY`, DB password) live only in `backend/.env`, never in frontend code. `frontend/.env` holds only the public API base URL. See note in `frontend/src/api/client.js` about Google Maps browser keys, which Google's own model expects client-side but which must be locked down by HTTP-referrer restriction in the Cloud Console — that's the correct control for that specific key type. |
| 2 | Purge Git secrets | `.gitignore` excludes `.env`, `*.pem`, `*.key`, `credentials.json` from the start. Run `scripts/purge-git-history.sh` if a secret was ever committed before this — see that file for the `git filter-repo` steps and the mandatory follow-up (rotate the leaked secret; deleting it from history doesn't undo exposure). |
| 3 | Use public DB key | The backend never connects as the Postgres superuser. `database/schema.sql` creates a scoped `vortexia_app` role with only `SELECT/INSERT/UPDATE` grants (no `DELETE`, no DDL), and that's the only credential in `DATABASE_URL`. |
| 4 | Enable row-level security | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on `users`, `vehicles`, `bookings` in `database/schema.sql`. |
| 5 | Encrypt sensitive data | Passwords hashed with bcrypt (never stored plain — measure 10). DB connections use `PGSSLMODE=require` (`backend/src/config/db.js`). Cookies and JWTs are signed. For data at rest beyond passwords (e.g. phone numbers), enable your cloud provider's disk-level encryption (RDS/Render encryption-at-rest) — that's an infra setting, not app code. |
| 6 | Enforce server-side auth | `backend/src/middleware/auth.js` — `requireAuth` verifies the JWT signature on every protected request; the frontend's `user` state is only ever a UI convenience, never trusted for actual access control. |
| 7 | Lock record access | RLS policies in `schema.sql` (`bookings_owner_access`, `vehicles_driver_write`, `users_self_access`) plus ownership checks in route WHERE clauses in `backend/src/routes/bookings.js` and `vehicles.js`. |
| 8 | Block field tampering | `whitelistFields()` in `backend/src/middleware/auth.js`, applied to the booking route — strips any field a client shouldn't be able to set (id, status, ownership) before it reaches validation or the DB. |
| 9 | Secure session cookies | `setSessionCookie()` in `backend/src/routes/auth.js` — `httpOnly`, `secure` (prod), `sameSite: "strict"`. |
| 10 | Hash passwords | `bcrypt.hash(password, 12)` in `backend/src/routes/auth.js`; plaintext password is never persisted or logged. |
| 11 | Rate limit login | `loginRateLimiter` in `backend/src/middleware/security.js` (8 attempts / 15 min), applied specifically to `POST /auth/login`. A looser general limiter (`apiRateLimiter`) covers the rest of the API. |
| 12 | Add bot protection | `verifyCaptcha` middleware in `backend/src/middleware/security.js` validates a reCAPTCHA/hCaptcha token server-side on register/login; secret key never leaves the backend. |
| 13 | Parameterize queries | Every query in `backend/src/routes/*.js` and `backend/src/config/db.js` uses `$1, $2...` placeholders — no string concatenation into SQL anywhere. |
| 14 | Validate all input | `backend/src/middleware/validate.js` — Zod schemas for register, login, booking, and location updates; invalid requests are rejected before touching business logic. |
| 15 | Escape user content | `escapeUserText()` in `backend/src/utils/sanitize.js` strips HTML/script from any free-text user input before storage or display. |
| 16 | Restrict file uploads | No file upload endpoints exist in this scaffold. If you add one (e.g. driver ID photos), gate it with: authenticated + role check, a strict MIME/extension allow-list, a size cap, re-encoding images server-side rather than trusting the upload as-is, and storing outside the web root (or in S3 with a signed URL) rather than serving uploaded files directly. |
| 17 | Trim API responses | `toPublicUser`, `toPublicVehicle`, `toPublicBooking` in `backend/src/utils/sanitize.js` — every route returns only these shaped objects, never raw DB rows (so password hashes, internal columns, etc. can't leak). |
| 18 | Add security headers | `helmet()` config in `backend/src/middleware/security.js` — CSP, HSTS, `X-Content-Type-Options`, frame-ancestors 'none', etc. |
| 19 | Force HTTPS | `forceHttps` middleware in `backend/src/middleware/security.js` redirects any plain-HTTP request in production; terminate TLS at your load balancer/reverse proxy (AWS ALB, Render, Vercel all do this for you on the edge). |
| 20 | Scan dependencies | `npm run audit` script in `backend/package.json` (`npm audit`). Wire this into CI (fail the build on moderate+ severity) and enable Dependabot/Renovate on the repo for automated update PRs. |

## A note on scope

This is a working scaffold, not a finished production deploy: the reCAPTCHA
widget, WebSocket auth handshake, refresh-token rotation, and CI/CD pipeline
are stubbed with comments explaining exactly what real infra to plug in,
since those depend on accounts/keys only you control.
