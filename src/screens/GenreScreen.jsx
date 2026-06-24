import { GENRES } from '../data/mockArtists.js'
import { GENRE_ICONS } from '../components/Icons.jsx'

export default function GenreScreen({ selectedGenres, onToggleGenre, onConfirm }) {
  const count = selectedGenres.length

  return (
    <div className="screen genre-screen splash-lang">
      {/* Status bar */}
      <div className="status-bar">
        <span className="status-bar-time">9:41</span>
      </div>

      {/* Masthead */}
      <div className="masthead">
        <span className="masthead-logo">SoundSwipe</span>
        <span />
      </div>

      {/* Header */}
      <div className="genre-header">
        <div className="eyebrow" style={{ marginBottom: 8 }}>What are you in the mood for</div>
        <div className="display-lg" style={{ marginBottom: 12 }}>
          Pick your<br /><span className="splash-lang-grad">sound.</span>
        </div>
      </div>

      {/* Genre grid */}
      <div className="genre-grid">
        {GENRES.map((genre) => {
          const isSelected = selectedGenres.includes(genre.id)
          const Icon = GENRE_ICONS[genre.id]
          return (
            <div
              key={genre.id}
              className={`genre-tile ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleGenre(genre.id)}
            >
              <span className="genre-tile-icon">
                {Icon ? <Icon size={26} /> : null}
              </span>
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
        <button
          className="btn btn-ink"
          onClick={onConfirm}
          disabled={count === 0}
          style={{ opacity: count === 0 ? 0.35 : 1, transition: 'opacity 0.2s' }}
        >
          Start Listening →
        </button>
      </div>
    </div>
  )
}
