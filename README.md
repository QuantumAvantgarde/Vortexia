# Vortexia

Dynamic trotro (public transport) route optimization app — built from the
System Analysis & Design documentation: React frontend, Node/Express backend,
PostgreSQL + PostGIS for geo data, WebSockets for live tracking.

## Structure

```
vortexia/
├── backend/           Express API (auth, bookings, vehicles, security middleware)
├── frontend/          React app (passenger map, driver dashboard)
├── database/
│   └── schema.sql     Tables + Row-Level Security policies
├── SECURITY.md        How each requested security measure is implemented
└── .gitignore
```

## Local setup

### 1. Database
```bash
createdb vortexia
psql vortexia -f database/schema.sql
```
Then edit the `vortexia_app` password in `schema.sql` (or ALTER ROLE afterwards)
to a real secret before deploying anywhere beyond your laptop.

### 2. Backend
```bash
cd backend
cp .env.example .env      # fill in real secrets — never commit .env
npm install
npm run dev                # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

## What's implemented vs. stubbed

Implemented: registration/login with hashed passwords, httpOnly session
cookies, the full seat-booking transaction (capacity check + insert as one
atomic query), RLS-scoped reads, nearby-vehicle search via PostGIS,
driver location updates, a basic demand heatmap, and every middleware in
`SECURITY.md`.

Stubbed for you to wire up with real infra: the reCAPTCHA widget on the
frontend (currently sends a placeholder token), the WebSocket auth handshake
and message routing, refresh-token rotation, Sentry error tracking, and the
CI/CD pipeline config — these depend on accounts/keys only you can provision.

See `SECURITY.md` for exactly where each of the 20 requested security
measures lives in the code.
