export default function SplashScreen({ onStart, onOpenManifesto, onReset }) {
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
        <div className="eyebrow" style={{ marginBottom: 10 }}>The music the algorithms missed</div>

        <div className="display-xl splash-display-anim" aria-label="SoundSwipe">
          <span className="l l1" aria-hidden="true">S</span>
          <span className="l l2" aria-hidden="true">o</span>
          <span className="l l3" aria-hidden="true">u</span>
          <span className="l l4" aria-hidden="true">n</span>
          <span className="l l5" aria-hidden="true">d</span>
          <br />
          <span className="splash-accent" aria-hidden="true">Swipe</span>
        </div>

        <div className="splash-rule-gap splash-rule-anim" />

        <p style={{
          fontSize: 15,
          color: 'var(--ink-mid)',
          lineHeight: 1.65,
          fontFamily: 'var(--font-body)',
          marginBottom: 16,
        }}>
          Streaming platforms push artists who already have momentum. We built SoundSwipe for everyone else — the songwriters in basements, the bedroom producers, the bands no algorithm has noticed yet.
        </p>

        <div className="splash-badge">
          <span>For underdogs · Driven by music, not metrics</span>
        </div>

        <button
          onClick={onOpenManifesto}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-light)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: '14px 0 0',
            textAlign: 'left',
            fontFamily: 'var(--font-body)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Why we built this →
        </button>
      </div>

      {/* Footer CTA */}
      <div className="splash-footer">
        <button className="btn btn-ink" onClick={onStart}>
          Start Listening →
        </button>
        <p className="splash-sub">For artists the world hasn't heard yet</p>
        {onReset && (
          <button
            onClick={() => {
              if (confirm('Reset all saved artists, genres, and Spotify connection?')) onReset()
            }}
            style={{
              display: 'block',
              margin: '14px auto 0',
              background: 'none',
              border: 'none',
              color: 'var(--ink-ghost)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: 4,
              fontFamily: 'var(--font-body)',
            }}
          >
            Reset prototype
          </button>
        )}
      </div>
    </div>
  )
}
