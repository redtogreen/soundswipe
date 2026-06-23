import { useEffect, useState } from 'react'

// Beat timing for the bottom HUD ticker — synced to the CSS camera animation.
const BEATS = [
  { label: 'Selecting your first discovery', counter: '1' },
  { label: 'Reading listener overlap',       counter: '4,217' },
  { label: 'Pulling community tags',         counter: '247' },
  { label: 'Computing match score',          counter: '0.92' },
  { label: 'Ready',                          counter: '↗ swipe to start' },
]

export default function LoadingScreen({ seedArtists }) {
  const [stageIdx, setStageIdx] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setStageIdx(1), 1700),
      setTimeout(() => setStageIdx(2), 3700),
      setTimeout(() => setStageIdx(3), 5700),
      setTimeout(() => setStageIdx(4), 7500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  // The wall is 9 tiles. The first seed (user's #1) gets the focus treatment
  // (named, captioned, higher contrast). Other seeds fill the rest.
  const seeds = seedArtists || []
  const focus = seeds[0] || null
  const beat = BEATS[stageIdx]

  return (
    <div className="screen ls-screen">
      <div className="ls-scene">
        <div className="ls-camera">

          {/* L1 — Photo wall, focus tile centered on screen */}
          <div className="ls-layer ls-layer-wall">
            <div className="ls-wall-grid">
              {Array.from({ length: 9 }, (_, i) => {
                const isFocus = i === 0
                const seed = seeds[i] || null
                const photo = seed?.image || null
                return (
                  <div
                    key={i}
                    className={`ls-tile ${isFocus ? 'ls-tile-focus' : `ls-tile-${i}`}`}
                    style={photo ? { backgroundImage: `url(${photo})` } : undefined}
                  >
                    {isFocus && (
                      <>
                        <div className="ls-tile-name">
                          {(focus?.name || 'Your anchor').toUpperCase()}
                        </div>
                        <div className="ls-tile-label">YOUR #1 ARTIST</div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* L2 — listener overlap */}
          <div className="ls-layer ls-layer-t1">
            <div className="ls-text">
              <div className="ls-eyebrow">SCANNING</div>
              <div className="ls-big">4,217<br /><span className="ls-grad">LISTENERS</span></div>
              <div className="ls-footnote">FROM YOUR SEED ARTISTS</div>
            </div>
          </div>

          {/* L3 — community tags */}
          <div className="ls-layer ls-layer-t2">
            <div className="ls-text">
              <div className="ls-eyebrow">TAGGED</div>
              <div className="ls-big">SIMILAR<br /><span className="ls-grad">SOUND</span></div>
              <div className="ls-footnote">+ STORYTELLING + RED DIRT</div>
            </div>
          </div>

          {/* L4 — match score */}
          <div className="ls-layer ls-layer-t3">
            <div className="ls-text">
              <div className="ls-eyebrow">RANKING</div>
              <div className="ls-big">0.92<br /><span className="ls-grad">MATCH</span></div>
              <div className="ls-footnote">CROSS-LISTENER OVERLAP</div>
            </div>
          </div>

          {/* L5 — final reveal */}
          <div className="ls-layer ls-layer-final">
            <div className="ls-text">
              <div className="ls-eyebrow">READY</div>
              <div className="ls-big-final">Swipe.</div>
              <div className="ls-arrow">↗</div>
            </div>
          </div>

        </div>
      </div>

      <div className="ls-vignette" aria-hidden="true" />

      <div className="ls-hud-top">
        <span>SOUNDSWIPE</span>
        <span>DISCOVER · 01</span>
      </div>

      <div className="ls-hud-bottom">
        <span className="ls-hud-stage">{beat.label}</span>
        <span className="ls-hud-counter">{beat.counter}</span>
      </div>
    </div>
  )
}
