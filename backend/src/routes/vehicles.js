import { Router } from "express";
import { querySystem, queryAsUser } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { toPublicVehicle } from "../utils/sanitize.js";

const router = Router();

// Public-ish (still requires a valid session — no anonymous scraping) nearby search.
// Uses PostGIS ST_DWithin for the "2km radius" rule from the Activity Diagram.
router.get("/nearby", requireAuth, async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: "lat and lng query params are required." });
  }

  const result = await querySystem(
    `SELECT vehicleid, licenseplate, capacity,
            ST_AsGeoJSON(currentlocation) AS currentlocation,
            capacity - COALESCE((
              SELECT COUNT(*) FROM bookings b
              WHERE b.vehicleid = v.vehicleid AND b.status = 'Pending'
            ), 0) AS seatsavailable
     FROM vehicles v
     WHERE ST_DWithin(currentlocation::geography, ST_MakePoint($1,$2)::geography, 2000)
       AND is_active = true`,
    [lng, lat]
  );

  res.json({ vehicles: result.rows.map(toPublicVehicle) });
});

// Driver pushes their own GPS position every ~3s (Non-Functional Requirement).
// requireRole("driver") + the WHERE clause below means a driver can only ever
// update the location of a vehicle they themselves are assigned to.
router.post("/:id/location", requireAuth, requireRole("driver"), validate("vehicleLocationUpdate"), async (req, res) => {
  const { lat, lng } = req.body;
  const result = await queryAsUser(
    req.user.id,
    `UPDATE vehicles SET currentlocation = ST_MakePoint($1, $2), updated_at = now()
     WHERE vehicleid = $3 AND driverid = $4
     RETURNING vehicleid`,
    [lng, lat, req.params.id, req.user.id]
  );
  if (result.rowCount === 0) return res.status(403).json({ error: "Not your vehicle." });
  res.status(204).send();
});

// Driver-only heatmap of pending pickup clusters near them.
router.get("/heatmap", requireAuth, requireRole("driver"), async (req, res) => {
  const result = await queryAsUser(
    req.user.id,
    `SELECT ST_AsGeoJSON(pickup_location) AS location, COUNT(*) AS demand
     FROM bookings WHERE status = 'Pending'
     GROUP BY pickup_location`
  );
  res.json({ heatmap: result.rows });
});

export default router;
