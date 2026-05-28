import { GENRES } from '../data/mockArtists.js'

export default function GenreScreen({ selectedGenres, onToggleGenre, onConfirm }) {
  const count = selectedGenres.length

  return (
    <div className="screen genre-screen">
      {/* Status bar */}
      <div className="status-bar">
        <span className="status-bar-time">9:41</span>
      </div>

      {/* Masthead */}
      <div className="masthead">
        <span className="masthead-logo">SoundSwipe</span>
        <span className="masthead-label">Section A</span>
      </div>

      {/* Header */}
      <div className="genre-header">
        <div className="display-lg" style={{ marginBottom: 8 }}>
          Pick Your<br />Sound
        </div>
        <div className="rule-heavy" />
      </div>

      {/* Genre grid */}
      <div className="genre-grid">
        {GENRES.map((genre) => {
          const isSelected = selectedGenres.includes(genre.id)
          return (
            <div
              key={genre.id}
              className={`genre-tile ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleGenre(genre.id)}
            >
              <span className="genre-tile-emoji">{genre.emoji}</span>
              <span className="genre-tile-name">{genre.label}</span>
              <span className="genre-check">✓</span>
            </div>
          )
        })}
        {/* Bottom padding tile spacer */}
        <div style={{ height: 12 }} />
        <div style={{ height: 12 }} />
      </div>

      {/* Footer */}
      <div className="genre-footer">
        <div className="genre-count">
          {count === 0
            ? 'Select at least one genre'
            : <><strong>{count} genre{count !== 1 ? 's' : ''}</strong> selected</>}
        </div>
        <button
          className="btn btn-ink"
          onClick={onConfirm}
          disabled={count === 0}
          style={{ opacity: count === 0 ? 0.35 : 1, transition: 'opacity 0.2s' }}
        >
          Find Artists →
        </button>
      </div>
    </div>
  )
}
