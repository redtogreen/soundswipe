import { isConfigured } from '../lib/spotify-auth.js'

export default function ConnectOrPickScreen({ onConnectSpotify, onPickGenres, onBack }) {
  const canConnect = isConfigured()

  return (
    <div className="screen splash splash-lang">
      <div className="status-bar">
        <span className="status-bar-time">9:41</span>
      </div>

      <div className="masthead">
        <button className="masthead-btn" onClick={onBack}>← Back</button>
        <span className="masthead-logo">SoundSwipe</span>
        <span />
      </div>

      <div className="splash-body" style={{ paddingTop: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Personalize your finds</div>

        <div className="display-lg" style={{ marginBottom: 18 }}>
          How should<br />
          <span className="splash-lang-grad">we start?</span>
        </div>

        {/* Spotify card — primary */}
        {canConnect && (
          <button className="onboarding-card onboarding-card-primary" onClick={onConnectSpotify}>
            <div className="onboarding-card-eyebrow">Recommended · For Spotify users</div>
            <div className="onboarding-card-title">Use my Spotify history</div>
            <div className="onboarding-card-sub">
              We'll find your top artists and surface emerging ones in the same sound. No typing required.
            </div>
            <div className="onboarding-card-cta">Connect Spotify →</div>
          </button>
        )}

        {/* Manual card */}
        <button className="onboarding-card onboarding-card-secondary" onClick={onPickGenres}>
          <div className="onboarding-card-eyebrow">No account · No data shared</div>
          <div className="onboarding-card-title">Pick genres myself</div>
          <div className="onboarding-card-sub">
            Choose the styles you want to hear and we'll go from there.
          </div>
          <div className="onboarding-card-cta">Pick genres →</div>
        </button>
      </div>
    </div>
  )
}
