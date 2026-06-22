import { useEffect, useState } from 'react'
import { IconSkip, IconSave, IconPlay, IconPause } from '../components/Icons.jsx'
import { getArtistTracks, formatDuration } from '../lib/itunes.js'

export default function ExpandScreen({
  artist,
  onSave,
  onSkip,
  onBack,
  isSaved,
  playPreview,
  pausePreview,
  currentAudioSrc,
  isAudioPlaying,
}) {
  if (!artist) return null

  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch up to 6 more tracks from iTunes whenever the expanded artist changes.
  // The current swipe-card preview is shown first so playback feels continuous.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getArtistTracks(artist.name, 6)
      .then((more) => {
        if (cancelled) return
        const head =
          artist.previewUrl && !more.some((t) => t.previewUrl === artist.previewUrl)
            ? [{
                id: `head-${artist.id}`,
                trackName: artist.trackName || 'Now playing',
                previewUrl: artist.previewUrl,
                duration: null,
              }]
            : []
        setTracks([...head, ...more])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [artist.id, artist.name])

  const handleTrackTap = (track) => {
    const isCurrent = currentAudioSrc === track.previewUrl
    if (isCurrent && isAudioPlaying) {
      pausePreview && pausePreview()
    } else {
      playPreview && playPreview(track.previewUrl)
    }
  }

  return (
    <div className="screen expand-screen">
      <div className="status-bar">
        <span className="status-bar-time">9:41</span>
      </div>

      <div className="masthead">
        <button className="masthead-btn" onClick={onBack}>← Back</button>
        <span className="masthead-logo">SoundSwipe</span>
        <button
          className="masthead-btn"
          onClick={onSave}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <IconSave size={14} />
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>

      {/* Hero photo */}
      <div className="expand-hero">
        <div
          className="expand-hero-image"
          style={{ backgroundImage: `url(${artist.photo})` }}
        />
      </div>

      <div className="expand-body">
        <div className="expand-meta-row">
          <div className="genre-stamp">{artist.genre}</div>
          {artist.followers > 0 && (
            <span className="expand-followers">
              {artist.followers.toLocaleString()} listeners
            </span>
          )}
        </div>

        <h1 className="expand-name">{artist.name}</h1>
        {artist.location && <div className="expand-location">{artist.location}</div>}

        <div className="rule-medium" style={{ marginBottom: 18 }} />

        {/* ── Track list — the new "Hear more" ─────────────────────── */}
        <div className="expand-section-label">More from {artist.name}</div>
        <div className="expand-tracks">
          {loading && <div className="expand-tracks-msg">Loading songs…</div>}
          {!loading && tracks.length === 0 && (
            <div className="expand-tracks-msg">No more previews available right now.</div>
          )}
          {tracks.map((t, i) => {
            const isCurrent = currentAudioSrc === t.previewUrl
            const isPlaying = isCurrent && isAudioPlaying
            return (
              <button
                key={t.id}
                className={`expand-track ${isCurrent ? 'current' : ''} ${isPlaying ? 'playing' : ''}`}
                onClick={() => handleTrackTap(t)}
              >
                <span className="expand-track-icon" aria-hidden="true">
                  {isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
                </span>
                <span className="expand-track-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="expand-track-name">{t.trackName}</span>
                {t.duration && (
                  <span className="expand-track-duration">{formatDuration(t.duration)}</span>
                )}
              </button>
            )
          })}
        </div>

        {artist.spotifyUrl && (
          <a
            href={artist.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="expand-platform-link"
          >
            Open on Spotify ↗
          </a>
        )}

        {/* ── About — bio is now secondary, below the tracks ─────── */}
        {artist.fullBio && (
          <>
            <div className="expand-section-label" style={{ marginTop: 24 }}>About</div>
            <p className="expand-bio">{artist.fullBio}</p>
          </>
        )}
      </div>

      {/* Bottom actions */}
      <div className="expand-actions">
        <button
          className="btn btn-outline"
          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={onSkip}
        >
          <IconSkip size={16} /> Skip
        </button>
        <button
          className="btn btn-amber"
          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={onSave}
        >
          <IconSave size={16} />
          {isSaved ? 'Saved' : 'Save Artist'}
        </button>
      </div>
    </div>
  )
}
