export default function SplashScreen({ onStart, onOpenManifesto, onReset }) {
  return (
    <div className="screen splash splash-v2">
      <div className="status-bar splash-v2-status">
        <span className="status-bar-time">9:41</span>
      </div>

      {/* Massive brutalist wordmark */}
      <div className="splash-v2-mark" aria-label="SoundSwipe">
        <div className="splash-v2-word splash-v2-sound" aria-hidden="true">SOUND</div>
        <div className="splash-v2-word splash-v2-swipe" aria-hidden="true">SWIPE.</div>
      </div>

      {/* Tagline + CTA */}
      <div className="splash-v2-footer">
        <p className="splash-v2-tagline">
          The music<br />the algorithms <em>missed.</em>
        </p>

        <button className="btn btn-ink" onClick={onStart}>
          Start listening →
        </button>

        <div className="splash-v2-micro">
          <button
            type="button"
            className="splash-v2-link"
            onClick={onOpenManifesto}
          >
            Why we built this →
          </button>
          {onReset && (
            <button
              type="button"
              className="splash-v2-reset"
              onClick={() => {
                if (confirm('Reset all saved artists, genres, and Spotify connection?')) onReset()
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
