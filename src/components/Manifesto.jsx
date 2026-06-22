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
          Algorithms recommend.<br />
          <span className="splash-accent">We introduce.</span>
        </h1>

        <div className="rule-heavy" style={{ margin: '16px 0 18px' }} />

        <p className="manifesto-body">
          Streaming runs on momentum. Already winning? You'll keep winning. Just starting out? Good luck breaking through. The artist whose sound matches yours most precisely may be three feet from your headphones — and there's no algorithm built to introduce you.
        </p>

        <p className="manifesto-body">
          SoundSwipe finds artists whose sound aligns with yours by looking at what fans of your favorites actually listen to — not just the genre tag. Then it makes amplifying them effortless: one tap to follow on Spotify, one tap to open on Apple Music, one tap to share with a friend who needs to hear it.
        </p>

        <p className="manifesto-body">
          Every week we publish the artists this community is helping rise. That leaderboard is real signal — the kind that turns 800 monthly listeners into 80,000 because a group of people got there first.
        </p>

        <p className="manifesto-body" style={{ fontWeight: 600, color: 'var(--ink)' }}>
          Streaming taught the world to listen. SoundSwipe is teaching it to discover.
        </p>

        <button className="btn btn-ink" onClick={onClose} style={{ marginTop: 20 }}>
          Start listening →
        </button>
      </div>
    </div>
  )
}
