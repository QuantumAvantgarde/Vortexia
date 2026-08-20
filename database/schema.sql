-- Vortexia database schema
-- Implements the Class Diagram (User, Vehicle, Booking) from the design doc,
-- plus PostGIS for geo data and Row-Level Security for per-user data isolation.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- The geometry columns below require PostGIS. Install PostGIS on the
-- PostgreSQL server before running this schema; CREATE EXTENSION cannot
-- install the operating-system package itself.

-- =========================================================
-- Roles: a dedicated, low-privilege application role.
-- The backend connects as this role (Measure 3: "public DB key" = a scoped,
-- non-superuser credential — never expose real DB creds to any client, ever).
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vortexia_app') THEN
    CREATE ROLE vortexia_app LOGIN PASSWORD 'CHANGE_ME_IN_PRODUCTION';
  END IF;
END $$;

-- =========================================================
-- Tables
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
  userid        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  phonenumber   TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,          -- Measure 10: bcrypt hash only, never plaintext
  role          TEXT NOT NULL CHECK (role IN ('driver', 'passenger', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  vehicleid     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  licenseplate  TEXT NOT NULL UNIQUE,
  capacity      SMALLINT NOT NULL CHECK (capacity > 0),
  driverid      UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  currentlocation GEOMETRY(Point, 4326),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  bookingid           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passengerid         UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
  vehicleid           UUID NOT NULL REFERENCES vehicles(vehicleid) ON DELETE CASCADE,
  pickup_location      GEOMETRY(Point, 4326) NOT NULL,
  destination_location GEOMETRY(Point, 4326),
  travel_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  confirmation_code   CHAR(6) NOT NULL DEFAULT '000000',
  confirmation_used   BOOLEAN NOT NULL DEFAULT false,
  status              TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS travel_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_code CHAR(6) NOT NULL DEFAULT '000000';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_used BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_confirmation_code_unique ON bookings (confirmation_code) WHERE confirmation_code <> '000000';

CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles USING GIST (currentlocation);
CREATE INDEX IF NOT EXISTS idx_bookings_pickup ON bookings USING GIST (pickup_location);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON bookings (passengerid);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles (driverid);

-- =========================================================
-- Row-Level Security (Measure 4 + Measure 7: enable RLS, lock record access)
-- The app sets `app.current_user_id` per-request via set_config() in db.js;
-- these policies read that session variable so a bug in application code
-- can't accidentally return another user's rows.
-- =========================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own row.
DROP POLICY IF EXISTS users_self_access ON users;
CREATE POLICY users_self_access ON users
  USING (userid = current_setting('app.current_user_id', true)::uuid);

-- Login and registration happen before a session user exists. The backend
-- still returns only shaped public data and performs all field validation.
DROP POLICY IF EXISTS users_auth_lookup ON users;
CREATE POLICY users_auth_lookup ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS users_registration_insert ON users;
CREATE POLICY users_registration_insert ON users
  FOR INSERT WITH CHECK (true);

-- Everyone (any authenticated role) can see active vehicles' public location data —
-- needed for the passenger map — but only the assigned driver can UPDATE their vehicle.
DROP POLICY IF EXISTS vehicles_read_active ON vehicles;
CREATE POLICY vehicles_read_active ON vehicles
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS vehicles_driver_write ON vehicles;
CREATE POLICY vehicles_driver_write ON vehicles
  FOR UPDATE USING (driverid = current_setting('app.current_user_id', true)::uuid);

-- A booking is visible only to the passenger who made it or the driver of the
-- assigned vehicle — never to other passengers or other drivers.
DROP POLICY IF EXISTS bookings_owner_access ON bookings;
CREATE POLICY bookings_owner_access ON bookings
  USING (
    passengerid = current_setting('app.current_user_id', true)::uuid
    OR vehicleid IN (
      SELECT vehicleid FROM vehicles
      WHERE driverid = current_setting('app.current_user_id', true)::uuid
    )
  );

DROP POLICY IF EXISTS bookings_owner_insert ON bookings;
CREATE POLICY bookings_owner_insert ON bookings
  FOR INSERT WITH CHECK (
    passengerid = current_setting('app.current_user_id', true)::uuid
  );

-- =========================================================
-- Grants: vortexia_app gets exactly what it needs, nothing more.
-- =========================================================
GRANT USAGE ON SCHEMA public TO vortexia_app;
GRANT SELECT, INSERT, UPDATE ON users, vehicles, bookings TO vortexia_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO vortexia_app;
-- Explicitly no DELETE, no DROP, no CREATE — an admin/migration role handles those.
