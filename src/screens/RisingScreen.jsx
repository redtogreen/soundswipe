import { useEffect, useState } from 'react'
import { fetchRising } from '../lib/amplify-tracking.js'

function weekDisplay(weekKey) {
  // weekKey looks like "2026-W25" — convert to "Week of Jun 16"
  if (!weekKey) return ''
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return weekKey
  const [, yearStr, weekStr] = match
  const year = Number(yearStr)
  const week = Number(weekStr)
  // ISO week 1 is the week with Jan 4 in it. Find Monday of given week.
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1) + (week - 1) * 7)
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function MovementBadge({ artist }) {
  if (artist.movement === 'new') {
    return <span className="rising-badge rising-badge-new">NEW</span>
  }
  if (artist.movement === 'up' && artist.lastWeekRank) {
    return <span className="rising-badge rising-badge-up">↑ from #{artist.lastWeekRank}</span>
  }
  if (artist.movement === 'down' && artist.lastWeekRank) {
    return <span className="rising-badge rising-badge-down">↓ from #{artist.lastWeekRank}</span>
  }
  return <span className="rising-badge rising-badge-same">—</span>
}

export default function RisingScreen({ onBack }) {
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    let cancelled = false
    fetchRising({ limit: 25 })
      .then((data) => { if (!cancelled) setState({ loading: false, error: null, data }) })
      .catch((err) => { if (!cancelled) setState({ loading: false, error: err.message, data: null }) })
    return () => { cancelled = true }
  }, [])

  const { loading, error, data } = state
  const artists = data?.artists || []
  const notConfigured = data && data.ok === false && data.reason === 'storage_not_configured'

  return (
    <div className="rising-screen">
      <header className="rising-header">
        <button className="rising-back" onClick={onBack} aria-label="Back">←</button>
        <div className="rising-eyebrow">SoundSwipe</div>
      </header>

      <div className="rising-hero">
        <h1 className="rising-title">Rising on SoundSwipe</h1>
        <p className="rising-subtitle">
          Artists our community is amplifying right now. Updated live.
        </p>
        {data?.week && (
          <div className="rising-week">
            Week of {weekDisplay(data.week)} · {data.week}
          </div>
        )}
      </div>

      {loading && (
        <div className="rising-loading">Counting the signal…</div>
      )}

      {error && (
        <div className="rising-empty">
          <strong>Couldn’t load the leaderboard.</strong>
          <p>{error}</p>
        </div>
      )}

      {notConfigured && (
        <div className="rising-empty">
          <strong>Leaderboard isn’t live yet.</strong>
          <p>
            Add <code>UPSTASH_REDIS_REST_URL</code> and <code>UPSTASH_REDIS_REST_TOKEN</code>
            {' '}to your Vercel env vars to start counting amplifications.
          </p>
        </div>
      )}

      {!loading && !error && !notConfigured && artists.length === 0 && (
        <div className="rising-empty">
          <strong>No amplifications yet this week.</strong>
          <p>Save and amplify an artist to put them on the board.</p>
        </div>
      )}

      {artists.length > 0 && (
        <ol className="rising-list">
          {artists.map((a) => (
            <li key={a.slug} className="rising-row">
              <div className="rising-rank">{a.rank}</div>
              {a.photo ? (
                <img src={a.photo} alt={a.name} className="rising-photo" />
              ) : (
                <div className="rising-photo rising-photo-empty" aria-hidden="true">♪</div>
              )}
              <div className="rising-info">
                <div className="rising-name">{a.name}</div>
                <div className="rising-stats">
                  {a.breakdown.spotify_follow > 0 && (
                    <span>{a.breakdown.spotify_follow} follows</span>
                  )}
                  {a.breakdown.apple_music_open > 0 && (
                    <span>{a.breakdown.apple_music_open} on Apple</span>
                  )}
                  {a.breakdown.share > 0 && (
                    <span>{a.breakdown.share} shares</span>
                  )}
                </div>
              </div>
              <div className="rising-meta">
                <div className="rising-total">{a.total}</div>
                <MovementBadge artist={a} />
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="rising-footer">
        <p>
          Every save on SoundSwipe is an invitation to amplify. Every tap counts toward the artist's week.
        </p>
      </div>
    </div>
  )
}
