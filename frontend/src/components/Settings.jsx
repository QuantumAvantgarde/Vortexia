import { useEffect, useState } from "react";

export default function Settings({ user }) {
  const key = `vortexia-settings-${user.userid || user.id || user.name}`;
  const [settings, setSettings] = useState({ theme: "light", notifications: true });
  useEffect(() => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch { /* use defaults */ }
    const next = { theme: "light", notifications: true, ...saved };
    setSettings(next);
    document.documentElement.dataset.theme = next.theme;
  }, [key]);
  function update(field, value) { const next = { ...settings, [field]: value }; setSettings(next); localStorage.setItem(key, JSON.stringify(next)); document.documentElement.dataset.theme = next.theme; }
  return <div className="screen"><div className="section-heading"><p className="eyebrow">ACCOUNT CONTROLS</p><h1>Settings</h1><p className="lead">Tune how Vortexia feels and how often it checks in.</p></div><section className="settings-card settings-list"><label className="setting-row"><span><strong>Appearance</strong><small>Choose a light or dark workspace</small></span><select value={settings.theme} onChange={(e) => update("theme", e.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select></label><label className="setting-row"><span><strong>Notifications</strong><small>Receive booking and route updates</small></span><input className="toggle" type="checkbox" checked={settings.notifications} onChange={(e) => update("notifications", e.target.checked)} /></label></section></div>;
}
