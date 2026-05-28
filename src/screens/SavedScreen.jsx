export default function SavedScreen({ savedArtists, onSelectArtist, onBack }) {
  return (
    <div className="screen saved-screen">
      {/* Status bar */}
      <div className="status-bar">
        <span className="status-bar-time">9:41</span>
      </div>

      {/* Masthead */}
      <div className="masthead">
        <span className="masthead-logo">SoundSwipe</span>
        {savedArtists.length > 0 && (
          <div className="saved-count-badge">{savedArtists.length} saved</div>
        )}
      </div>

      {/* Header */}
      <div className="saved-header">
        <div className="eyebrow" style={{ marginBottom: 6 }}>Your Collection</div>
        <div className="display-lg">Saved<br />Artists</div>
        <div className="rule-heavy" style={{ marginTop: 12 }} />
      </div>

      {/* List */}
      <div className="saved-list">
        {savedArtists.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">♪</div>
            <h3>Nothing Yet</h3>
            <p>Swipe right on artists you love to save them here.</p>
            <button
              className="btn btn-outline"
              onClick={onBack}
              style={{ marginTop: 8, width: 'auto', padding: '12px 24px' }}
            >
              ← Keep Discovering
            </button>
          </div>
        ) : (
          <>
            {savedArtists.map((artist) => (
              <div
                key={artist.id}
                className="saved-item"
                onClick={() => onSelectArtist(artist)}
              >
                <div
                  className="saved-thumb"
                  style={{ backgroundImage: `url(${artist.photo})` }}
                />
                <div className="saved-item-info">
                  <div className="saved-item-name">{artist.name}</div>
                  <div className="saved-item-track">♪ {artist.trackName}</div>
                </div>
                <div className="saved-item-right">
                  <div className="genre-stamp" style={{ fontSize: 8 }}>{artist.genre}</div>
                  <div className="saved-location-label">{artist.location}</div>
                </div>
              </div>
            ))}
            <div style={{ height: 20 }} />
          </>
        )}
      </div>

      {/* Footer */}
      {savedArtists.length > 0 && (
        <div className="saved-footer">
          <button className="btn btn-outline" onClick={onBack}>
            ← Keep Discovering
          </button>
        </div>
      )}
    </div>
  )
}
