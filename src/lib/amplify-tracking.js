// Amplification tracking — both local (for "has this artist been amplified
// by THIS user?" reads) and global (POST to /api/amplify so the Rising
// leaderboard tallies update).

const AMP_KEY = 'soundswipe_amplifications_v1'

export function loadAmps() {
  try {
    return JSON.parse(localStorage.getItem(AMP_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveAmps(amps) {
  try {
    localStorage.setItem(AMP_KEY, JSON.stringify(amps))
  } catch {}
}

/**
 * Record an amplification locally for one artist.
 * action: 'spotify_follow' | 'apple_music_open' | 'share'
 */
export function recordAmpLocal(artistId, action) {
  if (!artistId || !action) return
  const amps = loadAmps()
  const current = amps[artistId] || {}
  amps[artistId] = { ...current, [action]: true, lastTouched: Date.now() }
  saveAmps(amps)
}

/** Quick check used by UI (badges, etc.) */
export function hasAmp(artistId, action) {
  const amps = loadAmps()
  return Boolean(amps[artistId]?.[action])
}

/** Fire-and-forget POST to /api/amplify. Never blocks the UI. */
export async function postAmplify(artist, action) {
  try {
    await fetch('/api/amplify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artist: {
          name: artist.name,
          photo: artist.photo || null,
          spotifyUrl: artist.spotifyUrl || null,
        },
        action,
      }),
    })
  } catch {
    // best-effort; local count still happened
  }
}

/** Local + global in one call — the usual pattern. */
export function recordAmp(artist, action) {
  if (!artist) return
  recordAmpLocal(artist.id, action)
  postAmplify(artist, action)
}

export async function fetchRising({ limit = 20 } = {}) {
  const res = await fetch(`/api/rising?limit=${limit}`)
  if (!res.ok) throw new Error(`Couldn't load Rising (${res.status})`)
  return res.json()
}
