export default function Overview({ user }) {
  return (
    <div className="screen overview-page">
      <section className="page-hero">
        <p className="eyebrow">VORTEXIA SAFETY STANDARD</p>
        <h1>Move with confidence.</h1>
        <p className="lead">Vortexia connects passengers with verified trotro drivers and live route information, so every journey starts with a clearer picture.</p>
      </section>
      <div className="overview-grid">
        <article className="info-card"><span className="card-kicker">Typical journey</span><strong>20–45 minutes</strong><p>Most city rides fall in this range. Traffic, weather, and your selected route can change the actual arrival time.</p></article>
        <article className="info-card"><span className="card-kicker">Built for safety</span><strong>Verified operators</strong><p>Drivers are onboarded with identity checks, licence review, vehicle ownership evidence, and vehicle capacity checks.</p></article>
      </div>
      <section className="safety-section">
        <div><p className="eyebrow">BEFORE EVERY RIDE</p><h2>Simple safeguards, visible at every step.</h2></div>
        <ul className="safety-list"><li><b>01</b><span><strong>Driver training</strong> Service, road-safety, and passenger-care expectations are part of onboarding.</span></li><li><b>02</b><span><strong>Background review</strong> Identity and driving documentation are reviewed before a driver operates on the network.</span></li><li><b>03</b><span><strong>Live trip context</strong> Location updates and booking records help keep the journey accountable.</span></li></ul>
      </section>
      <section className="terms-card"><div><span className="card-kicker">Demo terms and conditions</span><h2>Testing mode</h2><p>For this demo, use only test details. Do not upload real identity documents or sensitive emergency information. A booking is a simulated request until production verification, payments, and dispatch are connected.</p></div><button className="primary" onClick={() => window.alert("Demo terms accepted for this session.")}>Accept demo terms</button></section>
      <p className="muted overview-note">Signed in as {user.name}. Your profile and ride details are only shown inside your account.</p>
    </div>
  );
}
