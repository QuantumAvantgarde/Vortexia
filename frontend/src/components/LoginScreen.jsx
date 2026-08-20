import { useState } from "react";
import { api } from "../api/client.js";

export default function LoginScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", phoneNumber: "", password: "", role: "passenger" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const field = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  function normalizePhoneNumber(phoneNumber) {
    const normalized = phoneNumber.trim().replace(/[\s()-]/g, "");
    return normalized.startsWith("0") ? `+233${normalized.slice(1)}` : normalized;
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // captchaToken would come from a real reCAPTCHA/hCaptcha widget render;
      // stubbed here since this is a scaffold, not a live-deployed frontend.
      const payload = { ...form, phoneNumber: normalizePhoneNumber(form.phoneNumber), captchaToken: "stub-token" };
      const { user } = mode === "login" ? await api.login(payload) : await api.register(payload);
      onAuthenticated(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <header className="landing-bar"><div className="topbar-brand"><span className="brand-mark small" aria-hidden="true" /><span>Vortexia</span></div><span className="landing-status"><i /> Live transit, less waiting</span></header>
      <div className="auth-layout">
        <section className="auth-visual">
          <p className="eyebrow">YOUR CITY, IN MOTION</p>
          <h1>Move through the city with more certainty.</h1>
          <p className="visual-copy">Find nearby trotros, reserve your seat, and stay close to every route that matters.</p>
          <div className="bus-photo" role="img" aria-label="City bus on an urban road" />
          <div className="route-note"><span className="route-dot" /> Accra route network <strong>Online</strong></div>
        </section>
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <h1>Vortexia</h1>
        </div>
        <p className="tagline">Smarter trotro routes, shorter waits.</p>

        <div className="tab-row" role="tablist">
          <button role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Log in
          </button>
          <button role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            Register
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <label>
              Full name
              <input value={form.name} onChange={field("name")} required minLength={2} maxLength={80} autoComplete="name" />
            </label>
          )}
          <label>
            Phone number
            <input value={form.phoneNumber} onChange={field("phoneNumber")} required placeholder="0201234567 or +233201234567" autoComplete="tel" />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={field("password")} required minLength={mode === "register" ? 10 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </label>
          {mode === "register" && (
            <label>
              I am a
              <select value={form.role} onChange={field("role")}>
                <option value="passenger">Passenger</option>
                <option value="driver">Driver</option>
              </select>
            </label>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
