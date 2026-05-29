// Thin-stroke geometric icon set — clean lines, forward-looking
// All icons inherit color via stroke="currentColor"; default 1.5px stroke.

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function IconSkip({ size = 22, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

export function IconHear({ size = 22, ...props }) {
  // Upward arrow — "open / hear more" gesture
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  )
}

export function IconSave({ size = 24, ...props }) {
  // Clean heart outline
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
    </svg>
  )
}

export function IconNote({ size = 12, ...props }) {
  // Single eighth-note — geometric
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="6" cy="18" r="3" />
      <path d="M9 18V5l9 2v3" />
    </svg>
  )
}

export function IconCircles({ size = 60, strokeWidth = 1, ...props }) {
  // Concentric circles tangent at bottom — Kanmon "aspiration" motif
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none"
         stroke="currentColor" strokeWidth={strokeWidth} {...props}>
      <circle cx="30" cy="43" r="3" fill="currentColor" stroke="none" />
      <circle cx="30" cy="38" r="8" />
      <circle cx="30" cy="31" r="15" />
      <circle cx="30" cy="24" r="22" />
    </svg>
  )
}

export function IconArrow({ size = 16, direction = 'right', ...props }) {
  // Directional thin arrow for nav cues
  const rotation = { right: 0, left: 180, up: -90, down: 90 }[direction] || 0
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}
         style={{ transform: `rotate(${rotation}deg)`, ...(props.style || {}) }} {...props}>
      <path d="M5 12h14" />
      <path d="M13 5l7 7-7 7" />
    </svg>
  )
}

// ─── Genre icons ──────────────────────────────────────────────────────
// Abstract geometric — one symbol per genre, same visual weight

export function IconGenreIndieFolk({ size = 18, ...props }) {
  // Single mountain triangle
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 5l-8 14h16L12 5z" />
    </svg>
  )
}

export function IconGenreDreamPop({ size = 18, ...props }) {
  // Crescent moon — single shape carved from circle
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <path d="M17 4a8 8 0 1 0 0 16 6 6 0 1 1 0-16z" />
    </svg>
  )
}

export function IconGenreIndieRock({ size = 18, ...props }) {
  // Lightning bolt
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <path d="M14 3l-8 11h6l-2 7 8-11h-6l2-7z" />
    </svg>
  )
}

export function IconGenreRBSoul({ size = 18, ...props }) {
  // Voice radiating — point + two arcs
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" />
      <path d="M6 13c2-3 10-3 12 0" />
      <path d="M3 10c4-5 14-5 18 0" />
    </svg>
  )
}

export function IconGenreSingerSongwriter({ size = 18, ...props }) {
  // Circle with diagonal pen-stroke through it
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="7" />
      <line x1="7" y1="17" x2="17" y2="7" />
    </svg>
  )
}

export function IconGenreLoFi({ size = 18, ...props }) {
  // Two cassette reels with center dots
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="8" cy="12" r="4" />
      <circle cx="16" cy="12" r="4" />
      <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconGenreElectronic({ size = 18, ...props }) {
  // Equalizer bars
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <line x1="5" y1="9" x2="5" y2="15" />
      <line x1="10" y1="6" x2="10" y2="18" />
      <line x1="14" y1="8" x2="14" y2="16" />
      <line x1="19" y1="11" x2="19" y2="13" />
    </svg>
  )
}

export function IconGenreFolk({ size = 18, ...props }) {
  // Two stacked triangles — forest depth
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 4l-7 10h14L12 4z" />
      <path d="M12 12l-5 8h10L12 12z" />
    </svg>
  )
}

export function IconGenreShoegaze({ size = 18, ...props }) {
  // Three horizontal parallel lines — wall of sound
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <line x1="4" y1="8" x2="20" y2="8" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="16" x2="20" y2="16" />
    </svg>
  )
}

export function IconGenreAmericana({ size = 18, ...props }) {
  // Trapezoid — open horizon / road
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <path d="M3 18l4-10h10l4 10H3z" />
    </svg>
  )
}

// ─── Audio state icons ─────────────────────────────────────────────
export function IconAudioOn({ size = 18, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

export function IconAudioOff({ size = 18, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  )
}

// Lookup by genre id — used by GenreScreen
export const GENRE_ICONS = {
  'indie-folk':        IconGenreIndieFolk,
  'dream-pop':         IconGenreDreamPop,
  'indie-rock':        IconGenreIndieRock,
  'r-b':               IconGenreRBSoul,
  'singer-songwriter': IconGenreSingerSongwriter,
  'lo-fi':             IconGenreLoFi,
  'electronic':        IconGenreElectronic,
  'folk':              IconGenreFolk,
  'shoegaze':          IconGenreShoegaze,
  'americana':         IconGenreAmericana,
}
