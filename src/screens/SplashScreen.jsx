export default function SplashScreen({ onStart }) {
  return (
    <div className="screen splash">
      {/* Vinyl record animation */}
      <div className="splash-logo-wrap">
        <div className="splash-vinyl" />
      </div>

      {/* Text */}
      <span className="splash-eyebrow">Independent Music Only</span>
      <h1 className="splash-title">Sound<br />Swipe</h1>
      <p className="splash-tagline">Discover What's Next</p>

      {/* Badge */}
      <div className="splash-indie-badge">
        No major labels · No top 40 · Ever
      </div>

      {/* CTA */}
      <button className="btn btn-primary" onClick={onStart}>
        Start Discovering
      </button>

      <button className="btn btn-secondary" style={{ marginTop: 8, fontSize: 13 }}>
        Artists with under 5,000 followers only
      </button>
    </div>
  )
}
