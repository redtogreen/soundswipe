import { useState } from 'react'

const MIN_SEEDS = 3
const MAX_SEEDS = 8

export default function ManualSeedScreen({ onStart, onBack }) {
  const [seeds, setSeeds] = useState([])
  const [input, setInput] = useState('')

  const addSeed = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    if (seeds.length >= MAX_SEEDS) return
    if (seeds.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return
    setSeeds([...seeds, trimmed])
    setInput('')
  }

  const removeSeed = (name) => {
    setSeeds(seeds.filter((s) => s !== name))
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSeed()
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
          Type {MIN_SEEDS} or more artists you can't stop listening to. We'll find you ones you've never heard.
        </p>
      </div>

      <div className="ms-body">
        <div className="ms-input-row">
          <input
            className="ms-input"
            type="text"
            placeholder="Type an artist's name…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            autoCapitalize="words"
            autoComplete="off"
            spellCheck="false"
            aria-label="Artist name"
          />
          <button
            className="ms-add-btn"
            onClick={addSeed}
            disabled={!input.trim() || seeds.length >= MAX_SEEDS}
            aria-label="Add artist"
          >
            +
          </button>
        </div>

        <div className="ms-chips">
          {seeds.map((name) => (
            <button
              key={name}
              className="ms-chip"
              onClick={() => removeSeed(name)}
              aria-label={`Remove ${name}`}
            >
              <span className="ms-chip-name">{name}</span>
              <span className="ms-chip-x" aria-hidden="true">×</span>
            </button>
          ))}
          {seeds.length === 0 && (
            <div className="ms-chips-empty">
              Try: Phoebe Bridgers, Bon Iver, Big Thief…
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
          onClick={() => onStart(seeds.map((name) => ({ name })))}
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
