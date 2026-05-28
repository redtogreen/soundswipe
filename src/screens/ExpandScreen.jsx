import { IconSkip, IconSave } from '../components/Icons.jsx'

export default function ExpandScreen({ artist, onSave, onSkip, onBack, isSaved }) {
  if (!artist) return null

  const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(artist.soundcloudUrl)}&color=%23F5A623&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`

  return (
    <div className="screen expand-screen">
      {/* Status bar */}
      <div className="status-bar">
        <span className="status-bar-time">9:41</span>
      </div>

      {/* Masthead with nav */}
      <div className="masthead">
        <button className="masthead-btn" onClick={onBack}>← Back</button>
        <span className="masthead-logo">SoundSwipe</span>
        <button className="masthead-btn" onClick={onSave} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
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

      {/* Scrollable body */}
      <div className="expand-body">
        {/* Genre + followers */}
        <div className="expand-meta-row">
          <div className="genre-stamp">{artist.genre}</div>
          <span className="expand-followers">{artist.followers.toLocaleString()} followers</span>
        </div>

        {/* Name */}
        <h1 className="expand-name">{artist.name}</h1>

        {/* Location */}
        <div className="expand-location">{artist.location}</div>

        {/* Rule */}
        <div className="rule-medium" style={{ marginBottom: 16 }} />

        {/* Full bio */}
        <p className="expand-bio">{artist.fullBio}</p>

        {/* Track label */}
        <div className="expand-track-label">Now Playing</div>

        {/* SoundCloud player */}
        <div className="expand-player">
          <iframe
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            title={`${artist.name} — ${artist.trackName}`}
            src={embedUrl}
          />
        </div>

        <div style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--ink-ghost)',
          fontStyle: 'italic',
          fontFamily: 'var(--font-body)',
          marginBottom: 8,
        }}>
          "{artist.trackName}"
        </div>
      </div>

      {/* Bottom actions */}
      <div className="expand-actions">
        <button className="btn btn-outline" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={onSkip}>
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
