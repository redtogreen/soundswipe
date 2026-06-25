import { useState, useEffect } from 'react'
import { SERVICES, loadServicePrefs, setPreferred } from '../lib/service-preferences.js'
import { isConfigured as isSpotifyConfigured } from '../lib/spotify-auth.js'
import { isAppleMusicConfigured } from '../lib/apple-music-auth.js'
import { isYouTubeConfigured } from '../lib/youtube-auth.js'

export default function ConnectServicesScreen({
  spotifyAuth,
  appleAuth,
  youtubeAuth,
  onConnectSpotify,
  onConnectAppleMusic,
  onConnectYouTube,
  onContinue,
  onPickGenres,
  onBack,
}) {
  const [prefs, setPrefs] = useState(loadServicePrefs())

  // Re-read on connection state changes so this screen reflects connected ✓
  useEffect(() => {
    setPrefs(loadServicePrefs())
  }, [spotifyAuth, appleAuth, youtubeAuth])

  const connectedMap = {
    'spotify': Boolean(spotifyAuth?.accessToken),
    'apple-music': Boolean(appleAuth?.authorized),
    'youtube-music':
      Boolean(youtubeAuth?.accessToken) &&
      youtubeAuth?.expiresAt &&
      Date.now() < youtubeAuth.expiresAt,
  }

  const oauthAvailable = {
    'spotify': isSpotifyConfigured(),
    'apple-music': isAppleMusicConfigured(),
    'youtube-music': isYouTubeConfigured(),
  }

  const togglePreferred = (id) => {
    const next = setPreferred(id, !prefs.preferred.includes(id))
    setPrefs(next)
  }

  const handleServiceTap = (svc) => {
    if (svc.oauth && svc.active && oauthAvailable[svc.id]) {
      if (svc.id === 'spotify' && !connectedMap.spotify) return onConnectSpotify()
      if (svc.id === 'apple-music' && !connectedMap['apple-music']) return onConnectAppleMusic()
      if (svc.id === 'youtube-music' && !connectedMap['youtube-music']) return onConnectYouTube()
    }
    // For deep-link platforms and not-yet-wired OAuth, just toggle preference
    togglePreferred(svc.id)
  }

  const anySelected =
    Object.values(connectedMap).some(Boolean) ||
    prefs.preferred.length > 0

  const oauthGroup = SERVICES.filter((s) => s.oauth)
  const deepLinkGroup = SERVICES.filter((s) => s.deepLink)

  return (
    <div className="screen cs-screen">
      <div className="status-bar">
        <span className="status-bar-time">9:41</span>
      </div>

      <div className="masthead">
        <button className="masthead-btn" onClick={onBack}>← Back</button>
        <span className="masthead-logo">SoundSwipe</span>
        <span />
      </div>

      <div className="cs-header">
        <div className="cs-eyebrow">Step 1 of 2</div>
        <h1 className="cs-display">
          Where do you<br />
          <span className="cs-grad">listen?</span>
        </h1>
        <p className="cs-sub">
          Pick the services you use. We'll find artists you'd love and follow them on every platform you connect.
        </p>
      </div>

      <div className="cs-list">
        <div className="cs-list-label">Connect for personalization</div>
        {oauthGroup.map((svc) => {
          const connected = connectedMap[svc.id]
          const available = oauthAvailable[svc.id]
          const preferred = prefs.preferred.includes(svc.id)
          const state = connected ? 'connected' : (preferred ? 'preferred' : 'idle')
          return (
            <ServiceRow
              key={svc.id}
              svc={svc}
              state={state}
              available={available && svc.active}
              onTap={() => handleServiceTap(svc)}
            />
          )
        })}

        <div className="cs-list-label" style={{ marginTop: 18 }}>Also listen here</div>
        {deepLinkGroup.map((svc) => {
          const preferred = prefs.preferred.includes(svc.id)
          return (
            <ServiceRow
              key={svc.id}
              svc={svc}
              state={preferred ? 'preferred' : 'idle'}
              available={true}
              onTap={() => handleServiceTap(svc)}
            />
          )
        })}
      </div>

      <div className="cs-footer">
        <button
          className="btn btn-ink"
          onClick={onContinue}
          disabled={!anySelected}
          style={{ opacity: anySelected ? 1 : 0.35 }}
        >
          Continue →
        </button>
        <button className="cs-genre-link" onClick={onPickGenres}>
          Or just pick a genre →
        </button>
      </div>
    </div>
  )
}

function ServiceRow({ svc, state, available, onTap }) {
  return (
    <button
      className={`cs-row cs-row-${state}`}
      onClick={onTap}
      disabled={!available && svc.oauth}
      type="button"
    >
      <div className="cs-row-info">
        <div className="cs-row-name">{svc.name}</div>
        <div className="cs-row-tag">
          {state === 'connected'
            ? 'Connected ✓'
            : state === 'preferred'
              ? 'I listen here ✓'
              : svc.tag}
        </div>
      </div>
      <div className="cs-row-cta">
        {state === 'idle' ? (svc.oauth && svc.active ? 'Connect →' : '+') : '✓'}
      </div>
    </button>
  )
}
