import { useState, useEffect, useRef } from 'react'

const MIN_SEEDS = 3
const MAX_SEEDS = 8
const DEBOUNCE_MS = 280

export default function ManualSeedScreen({ onStart, onBack }) {
  // Seeds are now full artist objects: { name, image, listeners }
  const [seeds, setSeeds] = useState([])
  const [input, setInput] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  // Debounced search on input change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = input.trim()
    if (q.length < 2) {
      setResults([])
      setShowDropdown(false)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/artist-search?q=${encodeURIComponent(q)}`)
        const data = await r.json()
        const filtered = (data.results || []).filter(
          (a) => !seeds.some((s) => s.name.toLowerCase() === a.name.toLowerCase())
        )
        setResults(filtered)
        setShowDropdown(filtered.length > 0)
        setActiveIdx(-1)
      } catch {
        setResults([])
        setShowDropdown(false)
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [input, seeds])

  const addArtist = (artist) => {
    if (seeds.length >= MAX_SEEDS) return
    if (seeds.some((s) => s.name.toLowerCase() === artist.name.toLowerCase())) return
    setSeeds([...seeds, artist])
    setInput('')
    setResults([])
    setShowDropdown(false)
    setActiveIdx(-1)
    if (inputRef.current) inputRef.current.focus()
  }

  const removeSeed = (name) => {
    setSeeds(seeds.filter((s) => s.name !== name))
  }

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (results.length > 0) {
        setActiveIdx((i) => Math.min(i + 1, results.length - 1))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && results[activeIdx]) {
        addArtist(results[activeIdx])
      } else if (results[0]) {
        addArtist(results[0])
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setActiveIdx(-1)
    }
  }

  const canStart = seeds.length >= MIN_SEEDS

  return (
    <div className="screen ms-screen">
      <div className="status-bar">
        <span className="status-bar-time">9:41</span>
      </div>

      <div className="masthead">
        <button className="masthead-btn" onClick={onBack}>← Back</button>
        <span className="masthead-logo">SoundSwipe</span>
        <span />
      </div>

      <div className="ms-header">
        <div className="ms-eyebrow">Step 2 of 2</div>
        <h1 className="ms-display">
          Tell us<br />
          <span className="ms-grad">your taste.</span>
        </h1>
        <p className="ms-sub">
          Search {MIN_SEEDS} or more artists you can't stop listening to. We'll find you ones you've never heard.
        </p>
      </div>

      <div className="ms-body">
        <div className="ms-input-wrap">
          <div className="ms-input-row">
            <input
              ref={inputRef}
              className="ms-input"
              type="text"
              placeholder="Search an artist…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              autoCapitalize="words"
              autoComplete="off"
              spellCheck="false"
              aria-label="Search for an artist"
              aria-autocomplete="list"
              aria-expanded={showDropdown}
            />
            {loading && <div className="ms-spinner" aria-hidden="true" />}
          </div>

          {/* Autocomplete dropdown */}
          {showDropdown && results.length > 0 && (
            <div className="ms-dropdown" role="listbox">
              {results.map((a, i) => (
                <button
                  key={a.name}
                  className={`ms-dropdown-item ${i === activeIdx ? 'active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault() // prevent blur before click
                    addArtist(a)
                  }}
                  role="option"
                  aria-selected={i === activeIdx}
                >
                  <div
                    className="ms-dropdown-photo"
                    style={a.image ? { backgroundImage: `url(${a.image})` } : undefined}
                  >
                    {!a.image && a.name.charAt(0)}
                  </div>
                  <div className="ms-dropdown-info">
                    <div className="ms-dropdown-name">{a.name}</div>
                    <div className="ms-dropdown-listeners">
                      {a.listeners.toLocaleString()} listeners
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {input.trim().length >= 2 && !loading && results.length === 0 && (
            <div className="ms-dropdown ms-dropdown-empty">
              No artists found for "{input.trim()}"
            </div>
          )}
        </div>

        <div className="ms-chips">
          {seeds.map((artist) => (
            <button
              key={artist.name}
              className="ms-chip"
              onClick={() => removeSeed(artist.name)}
              aria-label={`Remove ${artist.name}`}
            >
              {artist.image && (
                <span
                  className="ms-chip-photo"
                  style={{ backgroundImage: `url(${artist.image})` }}
                  aria-hidden="true"
                />
              )}
              <span className="ms-chip-name">{artist.name}</span>
              <span className="ms-chip-x" aria-hidden="true">×</span>
            </button>
          ))}
          {seeds.length === 0 && (
            <div className="ms-chips-empty">
              Try searching: Phoebe Bridgers, Bon Iver, Big Thief…
            </div>
          )}
        </div>

        <div className="ms-counter">
          {seeds.length} / {MIN_SEEDS}+ added
        </div>
      </div>

      <div className="ms-footer">
        <button
          className="btn btn-ink"
          onClick={() => onStart(seeds)}
          disabled={!canStart}
          style={{ opacity: canStart ? 1 : 0.35 }}
        >
          {canStart
            ? `Start listening · ${seeds.length} ${seeds.length === 1 ? 'seed' : 'seeds'} →`
            : `Add ${MIN_SEEDS - seeds.length} more →`}
        </button>
      </div>
    </div>
  )
}
