export default function SplashScreen({ onStart, onOpenManifesto, onReset }) {
  return (
    <div className="screen splash splash-v3">
      {/* Bottom layer: the "video" — CSS-keyframe montage placeholder until a
          real <video> element is wired in. Sits behind everything. */}
      <div className="splash-v3-video" aria-hidden="true" />

      {/* Middle layer: the brand gradient, masked so the SOUND/SWIPE letter
          shapes are cut out. The cutout reveals the video playing behind. */}
      <svg
        className="splash-v3-mask-svg"
        viewBox="0 0 360 720"
        preserveAspectRatio="xMidYMid slice"
        aria-label="SoundSwipe"
      >
        <defs>
          <linearGradient id="splashV3Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F7C0CE" />
            <stop offset="100%" stopColor="#F2D78D" />
          </linearGradient>
          <mask id="splashV3Cutout" maskUnits="userSpaceOnUse">
            {/* White = visible gradient; black text = punched-out window */}
            <rect x="0" y="0" width="360" height="720" fill="white" />
            <text
              x="-8" y="245"
              fontFamily="DM Sans, system-ui, sans-serif"
              fontWeight="700"
              fontSize="160"
              letterSpacing="-7"
              fill="black"
            >SOUND</text>
            <text
              x="18" y="405"
              fontFamily="DM Sans, system-ui, sans-serif"
              fontWeight="700"
              fontSize="160"
              letterSpacing="-7"
              fill="black"
            >SWIPE.</text>
          </mask>
        </defs>
        <rect
          x="0" y="0" width="360" height="720"
          fill="url(#splashV3Grad)"
          mask="url(#splashV3Cutout)"
        />
      </svg>

      <div className="splash-v3-status">9:41</div>

      <div className="splash-v3-footer">
        <p className="splash-v3-tagline">
          The music<br />the algorithms <em>missed.</em>
        </p>

        <button className="btn btn-ink" onClick={onStart}>
          Start listening →
        </button>

        <div className="splash-v3-micro">
          <button
            type="button"
            className="splash-v3-link"
            onClick={onOpenManifesto}
          >
            Why we built this →
          </button>
          {onReset && (
            <button
              type="button"
              className="splash-v3-reset"
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
