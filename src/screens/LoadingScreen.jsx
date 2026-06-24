export default function LoadingScreen({ seedArtists }) {
  // Pull first seed name for a personal touch in the brand moment.
  const firstSeed = (seedArtists || [])[0]?.name || null

  return (
    <div className="ls-screen">
      {/* Two charcoal curtains slide in from top + bottom, meet, hold while
          we narrate the discovery, then retract to reveal the swipe screen. */}
      <div className="ls-curtain ls-curtain-top" aria-hidden="true" />
      <div className="ls-curtain ls-curtain-bottom" aria-hidden="true" />

      <div className="ls-curtain-content">
        {/* Phase 1 — brand anchor */}
        <div className="ls-state ls-state-1">
          <div className="ls-brand">SOUND<br/>SWIPE.</div>
          {firstSeed && (
            <div className="ls-brand-sub">based on {firstSeed.toLowerCase()}</div>
          )}
        </div>

        {/* Phase 2 — scanning listeners */}
        <div className="ls-state ls-state-2">
          <div className="ls-state-eye">SCANNING</div>
          <div className="ls-state-big">4,217<br/><span className="ls-grad">LISTENERS</span></div>
          <div className="ls-state-sub">from your seeds</div>
        </div>

        {/* Phase 3 — community tags */}
        <div className="ls-state ls-state-3">
          <div className="ls-state-eye">TAGGED</div>
          <div className="ls-state-big">SIMILAR<br/><span className="ls-grad">SOUND</span></div>
          <div className="ls-state-sub">community overlap</div>
        </div>

        {/* Phase 4 — ranking */}
        <div className="ls-state ls-state-4">
          <div className="ls-state-eye">RANKING</div>
          <div className="ls-state-big">0.92<br/><span className="ls-grad">MATCH</span></div>
          <div className="ls-state-sub">cross-listener overlap</div>
        </div>

        {/* Phase 5 — ready, arrow */}
        <div className="ls-state ls-state-5">
          <div className="ls-ready">→</div>
          <div className="ls-state-sub">your matches</div>
        </div>
      </div>
    </div>
  )
}
