// db.js — single source of truth for the Postgres connection.
// Measure 1 (hide API keys) + Measure 3 (public DB key):
//   The connection string is read only from process.env, never hard-coded,
//   and it points at a restricted `vortexia_app` role (see database/schema.sql)
//   that has row-level-security-governed access — NOT the Postgres superuser.
import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: true } : false,
  max: 20,
  idleTimeoutMillis: 30000,
});

// Runs every query inside a transaction that first sets the Postgres session
// variable app.current_user_id, which the RLS policies in schema.sql key off of.
// This is what makes "lock record access" (Measure 7) enforceable at the DB layer,
// not just in application code.
export async function queryAsUser(userId, text, params = []) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [String(userId)]);
    const result = await client.query(text, params); // Measure 13: always parameterized ($1, $2...)
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// For unauthenticated / system-level reads only (e.g. public vehicle locations).
export async function querySystem(text, params = []) {
  return pool.query(text, params); // still parameterized
}
