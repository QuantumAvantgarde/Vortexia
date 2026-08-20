import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import LoginScreen from "./components/LoginScreen.jsx";
import PassengerMap from "./components/PassengerMap.jsx";
import DriverDashboard from "./components/DriverDashboard.jsx";
import Overview from "./components/Overview.jsx";
import Profile from "./components/Profile.jsx";
import Settings from "./components/Settings.jsx";
import HelpSupport from "./components/HelpSupport.jsx";
import Booking from "./components/Booking.jsx";
import { api } from "./api/client.js";
import "./styles/app.css";

function AppShell({ user, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(new Date());
  const [showGreeting, setShowGreeting] = useState(true);

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); const timeout = setTimeout(() => setShowGreeting(false), 1900); return () => { clearInterval(id); clearTimeout(timeout); }; }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  async function logout() {
    await onLogout();
    setSidebarOpen(false);
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "panel-open" : ""}`}>
      <div className="bus-slideshow" aria-hidden="true"><span /><span /><span /></div>
      <header className="topbar">
        <button className="icon-button menu-button" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle navigation" aria-expanded={sidebarOpen}>
          <span className="menu-lines" aria-hidden="true" />
        </button>
        <button className="topbar-brand brand-button" onClick={() => navigate("/overview")} aria-label="Vortexia overview">
          <span className="brand-mark small" aria-hidden="true" />
          <span>Vortexia</span>
        </button>
        <span className="topbar-context">{user.role === "driver" ? "Driver workspace" : "Passenger workspace"}</span>
        <div className="topbar-clock"><strong>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong><span>{now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span></div><div className="topbar-user"><span className="avatar">{user.name.charAt(0).toUpperCase()}</span><span>{user.name.split(" ")[0]}</span></div>
      </header>
      <aside className={`side-panel ${sidebarOpen ? "open" : ""}`} aria-label="Account navigation">
        <div className="profile-block"><span className="profile-avatar">{user.name.charAt(0).toUpperCase()}</span><div><strong>{user.name}</strong><span>{user.role}</span></div></div>
        <nav className="side-nav">
          <button className={location.pathname === "/overview" ? "active" : ""} onClick={() => { navigate("/overview"); setSidebarOpen(false); }}>Overview</button>
          <button className={location.pathname === "/profile" ? "active" : ""} onClick={() => { navigate("/profile"); setSidebarOpen(false); }}>Profile</button>
          <button className={location.pathname === "/settings" ? "active" : ""} onClick={() => { navigate("/settings"); setSidebarOpen(false); }}>Settings</button>
          <button className={location.pathname === "/help" ? "active" : ""} onClick={() => { navigate("/help"); setSidebarOpen(false); }}>Help & support</button>
                    {user.role === "passenger" && <button className={location.pathname === "/booking" ? "active" : ""} onClick={() => { navigate("/booking"); setSidebarOpen(false); }}>Book a seat</button>}
          <button onClick={() => { navigate(user.role === "driver" ? "/driver" : "/passenger"); setSidebarOpen(false); }}>{user.role === "driver" ? "Driver dashboard" : "Find a trotro"}</button>
        </nav>
        <button className="side-logout" onClick={logout}>Sign out</button>
      </aside>
      {sidebarOpen && <button className="panel-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <main className="app-main">{children}</main>
      {showGreeting && <div className="greeting-overlay" role="status"><span className="greeting-mark">V</span><p>{greeting}, {user.name.split(" ")[0]}</p><small>Your Vortexia journey starts here.</small></div>}
    </div>
  );
}

export default function App() {
  // `user` is only ever set from a successful /auth/login or /auth/register
  // response — the frontend never invents or trusts a role on its own
  // (server-side auth, Measure 6, is the real gate; this is just UI routing).
  const [user, setUser] = useState(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route
                    path="/booking"
                    element={user?.role === "passenger" ? <AppShell user={user} onLogout={async () => { await api.logout(); setUser(null); }}><Booking /></AppShell> : <Navigate to="/" replace />}
                  />
                  <Route
          path="/"
          element={
            user ? (
              <Navigate to="/overview" replace />
            ) : (
              <LoginScreen onAuthenticated={setUser} />
            )
          }
        />
        <Route
          path="/overview"
          element={user ? <AppShell user={user} onLogout={async () => { await api.logout(); setUser(null); }}><Overview user={user} /></AppShell> : <Navigate to="/" replace />}
        />
        <Route
          path="/profile"
          element={user ? <AppShell user={user} onLogout={async () => { await api.logout(); setUser(null); }}><Profile user={user} onNameChange={(name) => setUser((current) => ({ ...current, name }))} /></AppShell> : <Navigate to="/" replace />}
        />
        <Route
          path="/settings"
          element={user ? <AppShell user={user} onLogout={async () => { await api.logout(); setUser(null); }}><Settings user={user} /></AppShell> : <Navigate to="/" replace />}
        />
        <Route
          path="/help"
          element={user ? <AppShell user={user} onLogout={async () => { await api.logout(); setUser(null); }}><HelpSupport /></AppShell> : <Navigate to="/" replace />}
        />
        <Route
          path="/passenger"
          element={user?.role === "passenger" ? <AppShell user={user} onLogout={async () => { await api.logout(); setUser(null); }}><PassengerMap user={user} onLogout={() => setUser(null)} /></AppShell> : <Navigate to="/" replace />}
        />
        <Route
          path="/driver"
          element={user?.role === "driver" ? <AppShell user={user} onLogout={async () => { await api.logout(); setUser(null); }}><DriverDashboard user={user} onLogout={() => setUser(null)} /></AppShell> : <Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
