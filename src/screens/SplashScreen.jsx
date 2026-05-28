export default function SplashScreen({ onStart }) {
  return (
    <div className="screen splash">
      {/* Status bar */}
      <div className="status-bar">
        <span className="status-bar-time">9:41</span>
      </div>

      {/* Amber masthead */}
      <div className="masthead">
        <span className="masthead-logo">SoundSwipe</span>
        <span className="masthead-label">No. 001</span>
      </div>

      {/* Body */}
      <div className="splash-body">
        <div className="eyebrow" style={{ marginBottom: 10 }}>Discover What's Next</div>

        <div className="display-xl">
          Sound<br />
          <span className="splash-accent">Swipe</span>
        </div>

        <div className="splash-rule-gap" />

        <p style={{
          fontSize: 15,
          color: 'var(--ink-mid)',
          lineHeight: 1.65,
          fontFamily: 'var(--font-body)',
          marginBottom: 16,
        }}>
          The only app built exclusively for artists with under 5,000 followers. No major labels. No top 40. Ever.
        </p>

        <div className="splash-badge">
          <span>Indie only · Unsigned only · Always</span>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="splash-footer">
        <button className="btn btn-ink" onClick={onStart}>
          Start Discovering →
        </button>
        <p className="splash-sub">Unsigned artists only · Under 5,000 followers</p>
      </div>
    </div>
  )
}
