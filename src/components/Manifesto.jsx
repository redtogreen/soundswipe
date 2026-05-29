import { IconSkip } from './Icons.jsx'

export default function Manifesto({ onClose }) {
  return (
    <div className="manifesto-overlay" onClick={onClose}>
      <div className="manifesto" onClick={(e) => e.stopPropagation()}>
        <button
          className="manifesto-close"
          onClick={onClose}
          aria-label="Close"
        >
          <IconSkip size={18} />
        </button>

        <div className="eyebrow" style={{ marginBottom: 14 }}>Why we built this</div>

        <h1 className="manifesto-title">
          We're for music.<br />
          <span className="splash-accent">They're for metrics.</span>
        </h1>

        <div className="rule-heavy" style={{ margin: '16px 0 18px' }} />

        <p className="manifesto-body">
          Streaming platforms optimize for one thing: keeping you on the platform. Their algorithms reward what's already winning — pushing platinum to platinum while genuinely brilliant music never reaches anyone.
        </p>

        <p className="manifesto-body">
          The most original songs being made right now are happening in basements, bedrooms, and barns — by artists with 500 followers whose ideas your favorite artist will probably copy in three years.
        </p>

        <p className="manifesto-body">
          We built SoundSwipe for them. And for listeners who'd rather find something nobody else has heard than play the same Top 40 again.
        </p>

        <p className="manifesto-body" style={{ fontWeight: 600, color: 'var(--ink)' }}>
          We're not against streaming. We're against algorithms deciding for you.
        </p>

        <button className="btn btn-ink" onClick={onClose} style={{ marginTop: 20 }}>
          Start listening →
        </button>
      </div>
    </div>
  )
}
