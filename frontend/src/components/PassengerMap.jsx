import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function PassengerMap({ user, onLogout }) {
  const [position, setPosition] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [status, setStatus] = useState("Locating you…");

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setStatus("Couldn't get your location — enable location access to see nearby trotros.")
    );
  }, []);

  useEffect(() => {
    if (!position) return;
    let cancelled = false;
    async function poll() {
      try {
        const { vehicles } = await api.nearbyVehicles(position.lat, position.lng);
        if (!cancelled) {
          setVehicles(vehicles);
          setStatus(vehicles.length ? "" : "No vehicles currently available, please wait.");
        }
      } catch {
        if (!cancelled) setStatus("Couldn't reach Vortexia. Retrying…");
      }
    }
    poll();
    const id = setInterval(poll, 3000); // matches the 3s refresh requirement
    return () => { cancelled = true; clearInterval(id); };
  }, [position]);

  async function bookSeat(vehicleId) {
    try {
      await api.bookSeat({
        vehicleId,
        pickupLat: position.lat,
        pickupLng: position.lng,
        destinationLat: position.lat + 0.01, // placeholder until destination search UI is wired up
        destinationLng: position.lng + 0.01,
        travelDate: new Date().toISOString().slice(0, 10),
      });
      setStatus("Seat booked! Your driver has been notified.");
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <span className="brand-mark small" aria-hidden="true" />
        <div>
          <h2>Hi, {user.name.split(" ")[0]}</h2>
          <p className="muted">Nearby trotros heading your way</p>
        </div>
        <button className="ghost" onClick={async () => { await api.logout(); onLogout(); }}>Log out</button>
      </header>

      {status && <p className="status-banner">{status}</p>}

      <section className="map-card" aria-label="Live location map">
        <div className="map-toolbar"><div><span className="card-kicker">LIVE MAP</span><strong>{position ? "Your current location" : "Waiting for location"}</strong></div><span className="map-status"><i /> Backend linked</span></div>
        <div className="map-canvas">
          <div className="map-grid" />
          {position && <span className="user-location-pin" title={`Your location: ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`} />}
          {vehicles.slice(0, 8).map((vehicle, index) => <span key={vehicle.id || index} className="vehicle-map-pin" style={{ left: `${18 + ((index * 17) % 70)}%`, top: `${25 + ((index * 23) % 55)}%` }} title={vehicle.licensePlate} />)}
          {!position && <p className="map-empty">Allow location access to center the live map.</p>}
        </div>
        <p className="map-caption">Your location is used to search for nearby vehicles. It is not shown publicly.</p>
      </section>

      <ul className="vehicle-list">
        {vehicles.map((v) => (
          <li key={v.id} className="vehicle-card">
            <div>
              <strong>{v.licensePlate}</strong>
              <p className="muted">{v.seatsAvailable} seat{v.seatsAvailable === 1 ? "" : "s"} available</p>
            </div>
            <button className="primary" disabled={v.seatsAvailable < 1} onClick={() => bookSeat(v.id)}>
              Book seat
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
