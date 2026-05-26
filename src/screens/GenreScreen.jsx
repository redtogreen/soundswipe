import { GENRES } from '../data/mockArtists.js'

const GENRE_PHOTOS = {
  'indie-folk':        'https://picsum.photos/seed/genre-folk/200/140',
  'dream-pop':         'https://picsum.photos/seed/genre-dream/200/140',
  'indie-rock':        'https://picsum.photos/seed/genre-rock/200/140',
  'r-b':               'https://picsum.photos/seed/genre-rnb/200/140',
  'singer-songwriter': 'https://picsum.photos/seed/genre-sw/200/140',
  'lo-fi':             'https://picsum.photos/seed/genre-lofi/200/140',
  'electronic':        'https://picsum.photos/seed/genre-elec/200/140',
  'folk':              'https://picsum.photos/seed/genre-folk2/200/140',
  'shoegaze':          'https://picsum.photos/seed/genre-shoe/200/140',
  'americana':         'https://picsum.photos/seed/genre-am/200/140',
}

export default function GenreScreen({ selectedGenres, onToggleGenre, onConfirm }) {
  const count = selectedGenres.length

  return (
    <div className="screen genre-screen">
      <div className="genre-header">
        <h1>What's Your Sound?</h1>
        <p>Pick one or more genres to start discovering underground artists</p>
      </div>

      <div className="genre-grid">
        {GENRES.map((genre) => {
          const isSelected = selectedGenres.includes(genre.id)
          return (
            <div
              key={genre.id}
              className={`genre-tile ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleGenre(genre.id)}
            >
              <div
                className="genre-tile-bg"
                style={{ backgroundImage: `url(${GENRE_PHOTOS[genre.id]})` }}
              />
              <div className="genre-tile-label">
                <span className="genre-tile-emoji">{genre.emoji}</span>
                <span className="genre-tile-name">{genre.label}</span>
              </div>
              <div className="genre-check">✓</div>
            </div>
          )
        })}
      </div>

      <div className="genre-footer">
        <div className="genre-count">
          {count === 0
            ? 'Select at least one genre'
            : <><span>{count} genre{count !== 1 ? 's' : ''}</span> selected</>
          }
        </div>
        <button
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={count === 0}
          style={{ opacity: count === 0 ? 0.4 : 1, transition: 'opacity 0.2s' }}
        >
          Find Artists →
        </button>
      </div>
    </div>
  )
}
