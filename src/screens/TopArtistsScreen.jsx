import { useEffect, useMemo, useState } from 'react'
import { getTopArtists, InsufficientScopeError } from '../lib/spotify-api.js'
import { IconCircles } from '../components/Icons.jsx'

export default function TopArtistsScreen({ onStart, onPickGenres, onError, onBack }) {
  const [artists, setArtists] = useState(null)  // null = loading, [] = empty, [...] = loaded
  const [excluded, setExcluded] = useState(new Set())
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getTopArtists({ timeRange: 'medium_term', limit: 20 })
      .then((list) => { if (!cancelled) setArtists(list) })
      .catch((err) => {
        if (cancelled) return
        const msg = err?.message || ''
        if (err instanceof InsufficientScopeError) {
          if (onError) onError('insufficient_scope')
        } else if (msg.includes('Session expired') || msg.includes('Not connected')) {
          if (onError) onError('session_expired')
        } else {
          setLoadError(msg || 'Could not load top artists')
          setArtists([])
        }
      })
    return () => { cancelled = true }
  }, [onError])

  const selectedArtists = useMemo(
    () => (artists || []).filter((a) => !excluded.has(a.id)),
    [artists, excluded]
  )

  const toggle = (id) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleStart = () => {
    if (selectedArtists.length === 0) return
    // Build a WEIGHTED genre map — how many seed artists share each genre.
    // Then take the top genres in order so the swipe queue mirrors the
    // user's actual taste distribution, not a flat dedup.
    const weights = {}
    for (const artist of selectedArtists) {
      for (const g of artist.genres || []) {
        const slug = g.toLowerCase().replace(/\s+/g, '-')
        weights[slug] = (weights[slug] || 0) + 1
      }
    }
    const sortedGenres = Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([slug]) => slug)
    onStart(sortedGenres, selectedArtists)
  }

  return (
    <div className="screen genre-screen">
      <div className="status-bar">
        <span className="status-bar-time">9:41</span>
      </div>

      <div className="masthead">
        <button className="masthead-btn" onClick={onBack}>← Back</button>
        <span className="masthead-logo">SoundSwipe</span>
        <span className="masthead-label">Section B</span>
      </div>

      <div className="genre-header">
        <div className="eyebrow" style={{ marginBottom: 6 }}>Pulled from your Spotify</div>
        <div className="display-lg" style={{ marginBottom: 10 }}>
          Your top<br />artists
        </div>
        <div className="rule-heavy" />
        <p style={{
          marginTop: 12, fontSize: 13, color: 'var(--ink-mid)',
          lineHeight: 1.5, fontFamily: 'var(--font-body)',
        }}>
          We'll find emerging artists who sound like these. Tap any to exclude it from your seed.
        </p>
      </div>

      {artists === null && (
        <div className="empty-state" style={{ flex: 1 }}>
          <div className="empty-icon"><IconCircles size={64} /></div>
          <h3>Reading your library…</h3>
          <p>Asking Spotify for your top artists.</p>
        </div>
      )}

      {artists !== null && artists.length === 0 && (
        <div className="empty-state" style={{ flex: 1 }}>
          <div className="empty-icon"><IconCircles size={64} /></div>
          <h3>{loadError ? 'Hmm, that didn’t work' : 'No top artists yet'}</h3>
          <p>
            {loadError
              ? loadError
              : 'Spotify needs about 4 weeks of listening history before it can tell us your top artists. Try the manual route instead.'}
          </p>
          <button
            className="btn btn-outline"
            onClick={onPickGenres}
            style={{ marginTop: 8, width: 'auto', padding: '12px 24px' }}
          >
            Pick genres instead →
          </button>
        </div>
      )}

      {artists !== null && artists.length > 0 && (
        <div className="top-artists-grid">
          {artists.map((a) => {
            const isExcluded = excluded.has(a.id)
            return (
              <button
                key={a.id}
                className={`top-artist-tile ${isExcluded ? 'excluded' : ''}`}
                onClick={() => toggle(a.id)}
                aria-pressed={!isExcluded}
              >
                <div
                  className="top-artist-photo"
                  style={{ backgroundImage: a.image ? `url(${a.image})` : 'none' }}
                >
                  {!isExcluded && <span className="top-artist-check">✓</span>}
                </div>
                <div className="top-artist-name">{a.name}</div>
              </button>
            )
          })}
          <div style={{ height: 8 }} />
        </div>
      )}

      {artists !== null && artists.length > 0 && (
        <div className="genre-footer">
          <button
            className="btn btn-ink"
            onClick={handleStart}
            disabled={selectedArtists.length === 0}
            style={{ opacity: selectedArtists.length === 0 ? 0.35 : 1, transition: 'opacity 0.2s' }}
          >
            Start listening · {selectedArtists.length} {selectedArtists.length === 1 ? 'artist' : 'artists'} →
          </button>
        </div>
      )}
    </div>
  )
}
