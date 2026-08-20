// sanitize.js
import sanitizeHtml from "sanitize-html";

// Measure 15: escape/strip any user-supplied free text before it's stored or echoed back
// (e.g. driver dispute notes, admin messages) so it can never execute as HTML/script
// when rendered in the React frontend or an admin dashboard.
export function escapeUserText(input) {
  if (typeof input !== "string") return input;
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
}

// Measure 17: trim API responses to only the fields the client actually needs —
// never leak password hashes, internal IDs, or other users' raw location history.
export function toPublicUser(row) {
  return { id: row.userid, name: row.name, role: row.role };
}

export function toPublicVehicle(row) {
  return {
    id: row.vehicleid,
    licensePlate: row.licenseplate,
    capacity: row.capacity,
    currentLocation: row.currentlocation, // {lat, lng} only — no raw GPS trail
    seatsAvailable: row.seatsavailable,
  };
}

export function toPublicBooking(row) {
  return {
    id: row.bookingid,
    vehicleId: row.vehicleid,
    pickupLocation: row.pickuplocation,
    status: row.status,
    createdAt: row.createdat,
    travelDate: row.traveldate,
    confirmationCode: row.confirmationcode,
  };
}
