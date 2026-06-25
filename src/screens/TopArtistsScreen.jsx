import { useEffect, useMemo, useState } from 'react'
import { getTopArtists, InsufficientScopeError } from '../lib/spotify-api.js'

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
    // Weighted-genre map: how many seed artists share each genre. Top genres
    // become the seed for the swipe queue.
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
    <div className="screen ta-screen">
      <div className="ta-status">9:41</div>

      <div className="ta-mast">
        <button className="ta-back" onClick={onBack}>← Back</button>
        <span className="ta-mast-logo">SoundSwipe</span>
        <span className="ta-mast-spacer" />
      </div>

      <div className="ta-header">
        <div className="ta-eyebrow">Pulled from your Spotify</div>
        <h1 className="ta-display">
          Your top<br />
          <span className="ta-grad">artists.</span>
        </h1>
        <p className="ta-instr">
          We'll find artists who sound like these. Tap any to exclude.
        </p>
      </div>

      {artists === null && (
        <div className="ta-empty">
          <div className="ta-empty-pulse" aria-hidden="true" />
          <h3>Reading your library…</h3>
          <p>Asking Spotify for your top artists.</p>
        </div>
      )}

      {artists !== null && artists.length === 0 && (
        <div className="ta-empty">
          <h3>{loadError ? "Hmm, that didn't work" : 'No top artists yet'}</h3>
          <p>
            {loadError
              ? loadError
              : 'Spotify needs about 4 weeks of listening history before it can tell us your top artists. Try the manual route instead.'}
          </p>
          <button className="btn btn-outline" onClick={onPickGenres} style={{ width: 'auto', padding: '12px 24px', marginTop: 12 }}>
            Pick genres instead →
          </button>
        </div>
      )}

      {artists !== null && artists.length > 0 && (
        <>
          <div className="ta-grid">
            {artists.map((a) => {
              const isExcluded = excluded.has(a.id)
              return (
                <button
                  key={a.id}
                  className={`ta-tile ${isExcluded ? 'ta-tile-excluded' : ''}`}
                  onClick={() => toggle(a.id)}
                  aria-pressed={!isExcluded}
                >
                  <div
                    className="ta-tile-photo"
                    style={a.image ? { backgroundImage: `url(${a.image})` } : undefined}
                  />
                  <div className="ta-tile-name">{a.name}</div>
                  {!isExcluded && (
                    <span className="ta-tile-check" aria-hidden="true">✓</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="ta-footer">
            <button
              className="btn btn-ink"
              onClick={handleStart}
              disabled={selectedArtists.length === 0}
              style={{ opacity: selectedArtists.length === 0 ? 0.35 : 1 }}
            >
              Start listening · {selectedArtists.length} {selectedArtists.length === 1 ? 'artist' : 'artists'} →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
