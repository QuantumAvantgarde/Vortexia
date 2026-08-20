import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function DriverDashboard({ user, onLogout }) {
  const [vehicleId, setVehicleId] = useState(""); // assigned at onboarding in a real build
  const [heatmap, setHeatmap] = useState([]);
  const [status, setStatus] = useState("Waiting for shift to start…");
  const [onShift, setOnShift] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [driverDetails, setDriverDetails] = useState({ licence: "", ownership: "", seats: "", routes: ["", ""] });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!onShift || !vehicleId) return;
    const id = setInterval(() => {
      navigator.geolocation?.getCurrentPosition(async (pos) => {
        try {
          await api.updateVehicleLocation(vehicleId, pos.coords.latitude, pos.coords.longitude);
          const { heatmap } = await api.heatmap();
          setHeatmap(heatmap);
          setStatus("Live — location shared every 3s.");
        } catch (err) {
          setStatus(err.message);
        }
      });
    }, 3000);
    return () => clearInterval(id);
  }, [onShift, vehicleId]);

  useEffect(() => {
    if (!onShift) return;
    let cancelled = false;
    async function loadBookings() { try { const result = await api.driverBookings(); if (!cancelled) setBookings(result.bookings); } catch (error) { if (!cancelled) setStatus(error.message); } }
    loadBookings();
    const id = setInterval(loadBookings, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [onShift]);

  async function confirmBooking(id) { try { await api.confirmBooking(id); setBookings((current) => current.filter((booking) => booking.id !== id)); setStatus("Booking confirmed and code marked as used."); } catch (error) { setStatus(error.message); } }

  return (
    <div className="screen">
      <header className="screen-header">
        <span className="brand-mark small" aria-hidden="true" />
        <div>
          <h2>Hi, {user.name.split(" ")[0]}</h2>
          <p className="muted">Driver dashboard</p>
        </div>
        <button className="ghost" onClick={async () => { await api.logout(); onLogout(); }}>Log out</button>
      </header>

      {!onShift ? (
        <div className="shift-start driver-onboarding">
          <p className="eyebrow">DRIVER VERIFICATION</p>
          <p className="muted">Add demo onboarding details before starting a shift. Production verification should be completed by the operator.</p>
          <label>Driver licence reference<input value={driverDetails.licence} onChange={(e) => setDriverDetails({ ...driverDetails, licence: e.target.value })} placeholder="Licence number" /></label>
          <label>Vehicle ownership proof reference<input value={driverDetails.ownership} onChange={(e) => setDriverDetails({ ...driverDetails, ownership: e.target.value })} placeholder="Document reference" /></label>
          <label>Number of seats<input type="number" min="1" value={driverDetails.seats} onChange={(e) => setDriverDetails({ ...driverDetails, seats: e.target.value })} placeholder="At least 1" /></label>
          <label>Likely route 1<input value={driverDetails.routes[0]} onChange={(e) => setDriverDetails({ ...driverDetails, routes: [e.target.value, driverDetails.routes[1]] })} placeholder="e.g. Madina to Circle" /></label>
          <label>Likely route 2<input value={driverDetails.routes[1]} onChange={(e) => setDriverDetails({ ...driverDetails, routes: [driverDetails.routes[0], e.target.value] })} placeholder="e.g. Kasoa to Accra" /></label>
          <label>
            Vehicle ID
            <input value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} placeholder="Assigned at onboarding" />
          </label>
          <div className="form-actions"><button className="primary" disabled={!vehicleId || !driverDetails.licence || !driverDetails.ownership || !driverDetails.seats || !driverDetails.routes[0] || !driverDetails.routes[1]} onClick={() => { setOnShift(true); setSaved(true); }}>Start shift</button>{saved && <span className="save-state">Details saved for this session</span>}</div>
        </div>
      ) : (
        <>
          <p className="status-banner">{status}</p>
          <h3>Demand heat zones</h3>
          <ul className="heat-list">
            {heatmap.length === 0 && <li className="muted">No pending pickups nearby yet.</li>}
            {heatmap.map((zone, i) => (
              <li key={i} className="heat-item">
                <span className="heat-dot" style={{ opacity: Math.min(1, zone.demand / 5) }} />
                {zone.demand} passenger{zone.demand === 1 ? "" : "s"} waiting
              </li>
            ))}
          </ul>
          <h3>Passenger confirmations</h3>
          <ul className="heat-list booking-confirmations">
            {bookings.length === 0 && <li className="muted">No pending passenger codes for your vehicle.</li>}
            {bookings.map((booking) => <li className="heat-item" key={booking.id}><span><strong>{booking.confirmationCode}</strong><small>{booking.travelDate}</small></span><button className="primary" onClick={() => confirmBooking(booking.id)}>Confirm arrival</button></li>)}
          </ul>
          <button className="ghost" onClick={() => setOnShift(false)}>End shift</button>
        </>
      )}
    </div>
  );
}
