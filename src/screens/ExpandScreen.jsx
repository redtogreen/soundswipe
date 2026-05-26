export default function ExpandScreen({ artist, onSave, onSkip, onBack, isSaved }) {
  if (!artist) return null

  const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(artist.soundcloudUrl)}&color=%23f5a623&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`

  return (
    <div className="screen expand-screen">
      {/* Hero image */}
      <div className="expand-hero">
        <div
          className="expand-hero-image"
          style={{ backgroundImage: `url(${artist.photo})` }}
        />
        <div className="expand-hero-gradient" />

        {/* Back button */}
        <button className="expand-back-btn" onClick={onBack}>
          ←
        </button>
      </div>

      {/* Scrollable body */}
      <div className="expand-body">
        {/* Genre badge */}
        <div className="expand-genre-badge">{artist.genre}</div>

        {/* Name */}
        <h1 className="expand-name">{artist.name}</h1>

        {/* Location */}
        <div className="expand-location">
          <span>📍</span>
          <span>{artist.location}</span>
          <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>·</span>
          <span style={{ color: 'var(--text-muted)' }}>{artist.followers.toLocaleString()} followers</span>
        </div>

        {/* Full bio */}
        <p className="expand-bio">{artist.fullBio}</p>

        {/* Track label */}
        <div className="expand-track-label">▶ Now Playing</div>

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

        {/* Track name */}
        <div style={{
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginBottom: 8,
          fontStyle: 'italic',
        }}>
          "{artist.trackName}"
        </div>
      </div>

      {/* Action buttons */}
      <div className="expand-actions">
        <button
          className="btn btn-skip"
          onClick={onSkip}
        >
          ✕ Skip
        </button>
        <button
          className="btn btn-save"
          onClick={onSave}
          style={isSaved ? {
            background: 'rgba(34, 197, 94, 0.25)',
            borderColor: 'var(--save-color)',
          } : {}}
        >
          {isSaved ? '♥ Saved!' : '♥ Save Artist'}
        </button>
      </div>
    </div>
  )
}
