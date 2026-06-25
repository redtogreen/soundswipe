// Tracks which music services the user said they listen on. OAuth tokens
// live in their service-specific auth libs (spotify-auth.js, etc.). This is
// just the user's stated preference — useful for:
//   - Routing "Share" / "Open on…" links to the right platform
//   - Knowing which services to offer auto-follow on
//   - Re-prompting connection for services we've since enabled OAuth for

const KEY = 'soundswipe_service_prefs_v1'

export const SERVICES = [
  // OAuth — full taste pull + auto-follow
  { id: 'spotify',       name: 'Spotify',       tag: 'Most personalized',    oauth: true,  active: true },
  { id: 'apple-music',   name: 'Apple Music',   tag: 'Adds to your library', oauth: true,  active: true },
  { id: 'youtube-music', name: 'YouTube Music', tag: 'Subscribes to channels', oauth: true, active: true },
  // OAuth-capable but not yet wired
  { id: 'tidal',         name: 'Tidal',         tag: 'Coming soon',  oauth: true, active: false },
  { id: 'deezer',        name: 'Deezer',        tag: 'Coming soon',  oauth: true, active: false },
  { id: 'soundcloud',    name: 'SoundCloud',    tag: 'Coming soon',  oauth: true, active: false },
  // Deep-link platforms — saves route to artist pages there
  { id: 'amazon-music',  name: 'Amazon Music',  tag: 'Deep link',    deepLink: true },
  { id: 'pandora',       name: 'Pandora',       tag: 'Deep link',    deepLink: true },
  { id: 'iheart',        name: 'iHeartRadio',   tag: 'Deep link',    deepLink: true },
  { id: 'bandcamp',      name: 'Bandcamp',      tag: 'Deep link',    deepLink: true },
  { id: 'audiomack',     name: 'Audiomack',     tag: 'Deep link',    deepLink: true },
  { id: 'lastfm',        name: 'Last.fm',       tag: 'Scrobble tracker', deepLink: true },
]

export function loadServicePrefs() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : { preferred: [] }
  } catch {
    return { preferred: [] }
  }
}

export function saveServicePrefs(prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch {}
}

export function setPreferred(serviceId, on) {
  const prefs = loadServicePrefs()
  const set = new Set(prefs.preferred)
  if (on) set.add(serviceId)
  else set.delete(serviceId)
  const next = { ...prefs, preferred: [...set] }
  saveServicePrefs(next)
  return next
}

export function isPreferred(serviceId) {
  return loadServicePrefs().preferred.includes(serviceId)
}
