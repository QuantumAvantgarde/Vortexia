import { Router } from "express";
import crypto from "crypto";
import { queryAsUser } from "../config/db.js";
import { requireAuth, requireRole, whitelistFields } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { toPublicBooking } from "../utils/sanitize.js";

const router = Router();

// Seat Booking Workflow (Activity Diagram, Phase 2):
// 1. Passenger sets destination -> handled client-side via GET /vehicles/nearby
// 2-3. Availability check happens here against live capacity.
// 4-6. Reserve seat, push update to driver, return confirmation.
router.post(
  "/",
  requireAuth,
  requireRole("passenger"),
  whitelistFields(["vehicleId", "pickupLat", "pickupLng", "destinationLat", "destinationLng", "travelDate"]), // Measure 8
  validate("bookSeat"),
  async (req, res) => {
    const { vehicleId, pickupLat, pickupLng, destinationLat, destinationLng, travelDate } = req.body;

    try {
      // Everything in one transaction (queryAsUser) so a capacity check + insert is atomic —
      // prevents a race condition where two passengers grab the "last seat" simultaneously.
      let result;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const confirmationCode = String(Math.floor(100000 + Math.random() * 900000));
        try {
          result = await queryAsUser(
        req.user.id,
        `WITH capacity_check AS (
           SELECT v.capacity - COUNT(b.bookingid) AS seats_left
           FROM vehicles v
           LEFT JOIN bookings b ON b.vehicleid = v.vehicleid AND b.status = 'Pending'
           WHERE v.vehicleid = $1
           GROUP BY v.capacity
         )
         INSERT INTO bookings (bookingid, passengerid, vehicleid, pickup_location, destination_location, travel_date, confirmation_code, status)
         SELECT $2, $3, $1, ST_MakePoint($4, $5), ST_MakePoint($6, $7), $8::date, $9, 'Pending'
         FROM capacity_check WHERE seats_left > 0
         RETURNING bookingid, vehicleid, status, created_at AS createdat,
                   ST_AsGeoJSON(pickup_location) AS pickuplocation, travel_date AS traveldate, confirmation_code AS confirmationcode`,
        [vehicleId, crypto.randomUUID(), req.user.id, pickupLng, pickupLat, destinationLng, destinationLat, travelDate, confirmationCode]
          );
          break;
        } catch (error) {
          if (error.code !== "23505" || attempt === 2) throw error;
        }
      }

      if (result.rowCount === 0) {
        return res.status(409).json({ error: "No vehicles currently available, please wait." });
      }

      // In production: push result.rows[0] to the assigned driver over the WebSocket
      // channel here (real-time route deviation / new pickup waypoint).
      res.status(201).json({ booking: toPublicBooking(result.rows[0]) });
    } catch (err) {
      req.log?.error(err);
      res.status(500).json({ error: "Could not complete booking." });
    }
  }
);

// A passenger can only ever see THEIR OWN bookings — RLS in schema.sql enforces this
// at the database layer even if this route had a bug (Measure 7: lock record access).
router.get("/mine", requireAuth, requireRole("passenger"), async (req, res) => {
  const result = await queryAsUser(
    req.user.id,
    `SELECT bookingid, vehicleid, status, created_at AS createdat,
            ST_AsGeoJSON(pickup_location) AS pickuplocation
     FROM bookings WHERE passengerid = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json({ bookings: result.rows.map(toPublicBooking) });
});

router.get("/driver", requireAuth, requireRole("driver"), async (req, res) => {
  const result = await queryAsUser(req.user.id, `SELECT b.bookingid, b.vehicleid, b.status, b.travel_date AS traveldate, b.confirmation_code AS confirmationcode, b.confirmation_used AS confirmationused FROM bookings b JOIN vehicles v ON v.vehicleid = b.vehicleid WHERE v.driverid = $1 AND b.status = 'Pending' ORDER BY b.travel_date, b.created_at`, [req.user.id]);
  res.json({ bookings: result.rows.map((row) => ({ id: row.bookingid, vehicleId: row.vehicleid, status: row.status, travelDate: row.traveldate, confirmationCode: row.confirmationcode, confirmationUsed: row.confirmationused })) });
});

router.post("/:id/confirm", requireAuth, requireRole("driver"), async (req, res) => {
  const result = await queryAsUser(req.user.id, `UPDATE bookings SET confirmation_used = true, status = 'Completed' WHERE bookingid = $1 AND confirmation_used = false AND vehicleid IN (SELECT vehicleid FROM vehicles WHERE driverid = $2) RETURNING bookingid, status`, [req.params.id, req.user.id]);
  if (result.rowCount === 0) return res.status(409).json({ error: "Code already used or booking is not assigned to you." });
  res.json({ booking: result.rows[0] });
});

router.patch(
  "/:id/complete",
  requireAuth,
  requireRole("driver"),
  async (req, res) => {
    // Ownership check happens in the WHERE clause + RLS: a driver can only complete
    // a booking on a vehicle they are assigned to.
    const result = await queryAsUser(
      req.user.id,
      `UPDATE bookings SET status = 'Completed'
       WHERE bookingid = $1
         AND vehicleid IN (SELECT vehicleid FROM vehicles WHERE driverid = $2)
       RETURNING bookingid, status`,
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Booking not found." });
    res.json({ booking: result.rows[0] });
  }
);

export default router;
