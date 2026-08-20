// client.js — thin fetch wrapper for the Vortexia API.
//
// Measure 1 (hide API keys): this file never holds the reCAPTCHA secret, JWT
// secret, or DB credentials — those exist only in backend/.env. The one key
// that legitimately DOES ship to the browser is a Google Maps *browser* key,
// which Google's model expects to be public; it must be locked down instead
// via HTTP-referrer + API restrictions in the Google Cloud Console, and kept
// separate from the server-side GOOGLE_MAPS_SERVER_KEY used for backend
// geocoding calls.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://44.200.9.138/auth/login";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include", // sends the httpOnly session cookie automatically
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const details = body.details?.map((item) => item.message).join(" ");
    const error = new Error(details ? `${body.error} ${details}` : body.error || `Request failed (${res.status})`);
    error.details = body.details;
    throw error;
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request("/auth/logout", { method: "POST" }),

  nearbyVehicles: (lat, lng) => request(`/vehicles/nearby?lat=${lat}&lng=${lng}`),
  bookSeat: (data) => request("/bookings", { method: "POST", body: JSON.stringify(data) }),
  myBookings: () => request("/bookings/mine"),
  driverBookings: () => request("/bookings/driver"),
  confirmBooking: (bookingId) => request(`/bookings/${bookingId}/confirm`, { method: "POST" }),

  updateVehicleLocation: (vehicleId, lat, lng) =>
    request(`/vehicles/${vehicleId}/location`, { method: "POST", body: JSON.stringify({ lat, lng }) }),
  heatmap: () => request("/vehicles/heatmap"),
};
