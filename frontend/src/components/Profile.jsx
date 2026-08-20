import { useEffect, useState } from "react";

function storageKey(user) { return `vortexia-profile-${user.userid || user.id || user.name}`; }
function titleCaseName(value) { return value.trim().toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }

export default function Profile({ user, onNameChange }) {
  const [profile, setProfile] = useState({ name: user.name, photo: "", emergencyName: "", emergencyPhone: "", history: [] });
  const [saved, setSaved] = useState(false);

  useEffect(() => { try { setProfile({ ...profile, ...JSON.parse(localStorage.getItem(storageKey(user)) || "{}") }); } catch { /* use defaults */ } }, [user]);
  function update(field, value) { setProfile((current) => ({ ...current, [field]: value })); setSaved(false); }
  function save(event) { event.preventDefault(); const next = { ...profile, name: titleCaseName(profile.name) }; setProfile(next); localStorage.setItem(storageKey(user), JSON.stringify(next)); onNameChange(next.name); setSaved(true); }
  function photo(event) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => update("photo", reader.result); reader.readAsDataURL(file); }

  return <div className="screen"><div className="section-heading"><div><p className="eyebrow">PRIVATE ACCOUNT</p><h1>Your profile</h1><p className="lead">Only this signed-in browser account can view these details.</p></div></div><form className="settings-card profile-form" onSubmit={save}><div className="profile-photo-row"><div className="large-profile-photo">{profile.photo ? <img src={profile.photo} alt="Profile" /> : profile.name.charAt(0).toUpperCase()}</div><label className="file-button">Add a picture<input type="file" accept="image/*" onChange={photo} /></label></div><label>Full name<input value={profile.name} onChange={(e) => update("name", e.target.value)} placeholder="Your full name" /></label><label>Emergency contact name<input value={profile.emergencyName} onChange={(e) => update("emergencyName", e.target.value)} placeholder="Trusted contact" /></label><label>Emergency contact telephone<input value={profile.emergencyPhone} onChange={(e) => update("emergencyPhone", e.target.value)} placeholder="0550000000" /></label><div className="private-history"><div><span className="card-kicker">Ride history</span><strong>{profile.history.length ? `${profile.history.length} saved rides` : "No rides recorded yet"}</strong></div><p className="muted">Completed and booked journeys will appear here when trip history is connected.</p></div><div className="form-actions"><button className="primary" type="submit">Save private profile</button>{saved && <span className="save-state">Saved</span>}</div></form></div>;
}
