import { useEffect, useState } from 'react'

const PHASES = [
  'Listening to your taste',
  'Finding artists who match it',
  'Cueing up previews',
]

export default function LoadingScreen({ seedArtists }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    // Walk through the phases on a timer so the user feels progress.
    // The actual fetch finishes when the parent navigates away.
    const t1 = setTimeout(() => setPhase(1), 1500)
    const t2 = setTimeout(() => setPhase(2), 4500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const seedNames = (seedArtists || [])
    .slice(0, 3)
    .map((a) => a.name || a)
    .filter(Boolean)

  return (
    <div className="screen loading-screen">
      <div className="status-bar">
        <span className="status-bar-time">9:41</span>
      </div>

      <div className="masthead">
        <span className="masthead-logo">SoundSwipe</span>
      </div>

      <div className="loading-body">
        <div className="loading-pulse" aria-hidden="true">
          <div className="loading-ring loading-ring-1" />
          <div className="loading-ring loading-ring-2" />
          <div className="loading-ring loading-ring-3" />
        </div>

        <div className="loading-text">
          <div className="eyebrow">Discovering</div>
          <div className="loading-phase">{PHASES[phase]}…</div>
          {seedNames.length > 0 && (
            <p className="loading-seeds">
              Based on{' '}
              <strong>{seedNames.join(' · ')}</strong>
              {seedArtists && seedArtists.length > 3 && (
                <span className="loading-and-more"> + {seedArtists.length - 3} more</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
