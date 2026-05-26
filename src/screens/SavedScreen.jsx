export default function SavedScreen({ savedArtists, onSelectArtist, onBack }) {
  return (
    <div className="screen saved-screen">
      {/* Header */}
      <div className="saved-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
            Your Collection
          </div>
          <h1>Saved Artists</h1>
        </div>
        {savedArtists.length > 0 && (
          <div className="saved-count-pill">{savedArtists.length}</div>
        )}
      </div>

      {/* List */}
      <div className="saved-list">
        {savedArtists.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💿</div>
            <h3>Nothing Yet</h3>
            <p>Swipe right on artists you love to save them here.</p>
            <button className="btn btn-ghost" onClick={onBack} style={{ marginTop: 8 }}>
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
                {/* Thumbnail */}
                <div
                  className="saved-item-thumb"
                  style={{ backgroundImage: `url(${artist.photo})` }}
                />

                {/* Info */}
                <div className="saved-item-info">
                  <div className="saved-item-name">{artist.name}</div>
                  <div className="saved-item-track">♪ {artist.trackName}</div>
                </div>

                {/* Right side */}
                <div className="saved-item-right">
                  <div className="saved-genre-badge">{artist.genre}</div>
                  <div className="saved-location">{artist.location}</div>
                </div>
              </div>
            ))}

            {/* Footer spacer */}
            <div style={{ height: 20 }} />
          </>
        )}
      </div>

      {/* Bottom action */}
      {savedArtists.length > 0 && (
        <div className="saved-footer">
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onBack}>
            ← Keep Discovering
          </button>
        </div>
      )}
    </div>
  )
}
