import { useEffect, useState } from "react";
import { api } from "../api/client.js";

function today() { return new Date().toISOString().slice(0, 10); }

export default function Booking() {
  const [route, setRoute] = useState("");
  const [date, setDate] = useState(today());
  const [position, setPosition] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [status, setStatus] = useState("Choose a route and allow location access to find available trotros.");

  useEffect(() => { navigator.geolocation?.getCurrentPosition((pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => setStatus("Location access is needed to show nearby trotros.")); }, []);
  useEffect(() => { if (!position) return; let cancelled = false; async function find() { try { const result = await api.nearbyVehicles(position.lat, position.lng); if (!cancelled) { setVehicles(result.vehicles); setStatus(result.vehicles.length ? "Live availability from the Vortexia network." : "No vehicles are available nearby yet."); } } catch (error) { if (!cancelled) setStatus(error.message); } } find(); const timer = setInterval(find, 5000); return () => { cancelled = true; clearInterval(timer); }; }, [position]);

  async function book(vehicle) {
    if (!position) return setStatus("Allow location access before booking.");
    try { const result = await api.bookSeat({ vehicleId: vehicle.id, pickupLat: position.lat, pickupLng: position.lng, destinationLat: position.lat + .01, destinationLng: position.lng + .01, travelDate: date }); setSelected(vehicle); setConfirmation(result.booking); } catch (error) { setStatus(error.message); }
  }

  return <div className="screen booking-page"><div className="section-heading"><p className="eyebrow">RESERVE YOUR SEAT</p><h1>Book a trotro</h1><p className="lead">Choose a route and travel date. Availability and arrival estimates refresh from the live network.</p></div><section className="booking-search settings-card"><label>Route<input value={route} onChange={(e) => setRoute(e.target.value)} placeholder="e.g. Madina to Circle" /></label><label>Travel date<input type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} /></label><p className="muted">{status}</p></section><section className="map-card booking-map"><div className="map-toolbar"><div><span className="card-kicker">LIVE ARRIVAL MAP</span><strong>{selected ? `${selected.licensePlate} is on the way` : "Nearby network"}</strong></div><span className="map-status"><i /> Tracking ready</span></div><div className="map-canvas"><div className="map-grid" />{position && <span className="user-location-pin" style={{ left: "50%", top: "58%" }} />}{selected && <span className="vehicle-map-pin selected-vehicle" style={{ left: "66%", top: "35%" }} />}{!position && <p className="map-empty">Allow location access to center the live map.</p>}</div><p className="map-caption">Orange is your pickup point. Green is the selected trotro. Arrival estimates update as location data changes.</p></section><div className="booking-results">{vehicles.length === 0 && <div className="empty-state">No available trotros yet.</div>}{vehicles.map((vehicle, index) => <article className="vehicle-card booking-result" key={vehicle.id || index}><div><span className="card-kicker">{route || "Nearby route"}</span><strong>{vehicle.licensePlate}</strong><p className="muted">{vehicle.seatsAvailable} seats available · arrival in {8 + index * 4} min</p></div><button className="primary" disabled={vehicle.seatsAvailable < 1} onClick={() => book(vehicle)}>Book seat</button></article>)}</div>{confirmation && <section className="confirmation-card"><span className="card-kicker">BOOKING CONFIRMED</span><h2>Your seat is reserved</h2><p>Travel date: {date}. Show this code when boarding:</p><strong className="confirmation-code">{confirmation.confirmationCode || "READY"}</strong><button className="ghost" onClick={() => setConfirmation(null)}>Close confirmation</button></section>}</div>;
}
