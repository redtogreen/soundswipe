// Spotify Web Playback SDK wrapper.
//
// This is the ONLY playback path that produces real Spotify streams
// (30-second minimum, subject to their standard counting rules).
//
// Requirements:
//   - User has Spotify Premium (checked via profile.product)
//   - Browser supports Widevine EME + MediaSource
//   - NOT iOS Safari (Apple blocks the underlying APIs) — check with
//     isPlaybackSDKSupported() before offering the toggle
//   - Token has 'streaming' scope (added in spotify-auth.js)

import { getStoredAuth, refreshAccessToken, isExpired } from './spotify-auth.js'

const SDK_SRC = 'https://sdk.scdn.co/spotify-player.js'

let sdkLoadPromise = null
let player = null
let deviceId = null
let readyPromise = null
let readyResolve = null

/** Feature-detect whether Web Playback SDK can even work in this browser. */
export function isPlaybackSDKSupported() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  // Spotify SDK does not work on iOS at all (any browser on iOS is Safari underneath)
  if (/iPhone|iPad|iPod/.test(ua)) return false
  // Requires MSE + EME (Widevine)
  if (typeof window.MediaSource === 'undefined') return false
  if (typeof navigator.requestMediaKeySystemAccess !== 'function') return false
  return true
}

/** Convenience — the user is Premium AND on a supported browser. */
export function canUseStreamMode(spotifyAuth) {
  if (!spotifyAuth?.accessToken) return false
  if (spotifyAuth?.profile?.product !== 'premium') return false
  return isPlaybackSDKSupported()
}

/** Get a fresh token, refreshing if necessary. */
async function getFreshToken() {
  let auth = getStoredAuth()
  if (!auth) throw new Error('Not connected to Spotify')
  if (isExpired(auth)) {
    const refreshed = await refreshAccessToken()
    if (!refreshed) throw new Error('Spotify session expired')
    auth = refreshed
  }
  return auth.accessToken
}

function loadSDK() {
  if (sdkLoadPromise) return sdkLoadPromise
  sdkLoadPromise = new Promise((resolve, reject) => {
    if (window.Spotify) return resolve(window.Spotify)
    // The SDK calls this global when ready
    window.onSpotifyWebPlaybackSDKReady = () => resolve(window.Spotify)
    const script = document.createElement('script')
    script.src = SDK_SRC
    script.async = true
    script.onerror = () => reject(new Error('Spotify SDK failed to load'))
    document.body.appendChild(script)
  })
  return sdkLoadPromise
}

/**
 * Initialize the player (idempotent). Resolves once the SDK is loaded AND
 * a device has become ready to receive playback commands.
 */
export async function initPlayer() {
  if (player && deviceId) return player
  if (readyPromise) return readyPromise

  readyPromise = (async () => {
    const Spotify = await loadSDK()
    player = new Spotify.Player({
      name: 'SoundSwipe',
      getOAuthToken: (cb) => {
        getFreshToken().then((token) => cb(token)).catch(() => cb(''))
      },
      volume: 0.9,
    })

    player.addListener('ready', ({ device_id }) => {
      deviceId = device_id
    })
    player.addListener('not_ready', () => {
      deviceId = null
    })
    player.addListener('initialization_error', ({ message }) => {
      console.warn('[stream] init error', message)
    })
    player.addListener('authentication_error', ({ message }) => {
      console.warn('[stream] auth error — user may not be Premium', message)
    })
    player.addListener('account_error', ({ message }) => {
      console.warn('[stream] account error', message)
    })

    const connected = await player.connect()
    if (!connected) throw new Error('Player refused to connect')

    // Wait up to 5 seconds for a device to become ready
    const deviceReady = await new Promise((resolve) => {
      const t = setTimeout(() => resolve(false), 5000)
      const check = setInterval(() => {
        if (deviceId) { clearInterval(check); clearTimeout(t); resolve(true) }
      }, 100)
    })
    if (!deviceReady) throw new Error('Player device did not become ready')
    return player
  })()

  return readyPromise
}

/** True if the player is initialized AND has an active device. */
export function isPlayerReady() {
  return Boolean(player && deviceId)
}

/** Start playing a specific Spotify track URI on our player device. */
export async function playSpotifyUri(uri) {
  if (!uri) throw new Error('No URI')
  if (!deviceId) throw new Error('Player not ready')
  const token = await getFreshToken()
  const res = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [uri] }),
    }
  )
  // 204 = success (no body). 404 = device gone. 403 = not Premium.
  if (res.status === 403) throw new Error('premium_required')
  if (res.status === 404) { deviceId = null; throw new Error('device_gone') }
  if (!res.ok && res.status !== 204) throw new Error(`play_failed_${res.status}`)
}

/** Pause the player. */
export async function pauseSpotify() {
  if (player) {
    try { await player.pause() } catch { /* ignore */ }
  }
}

/** Set volume (0–1). */
export async function setSpotifyVolume(v) {
  if (player) {
    try { await player.setVolume(Math.max(0, Math.min(1, v))) } catch {}
  }
}

/** Tear down completely — call on Spotify disconnect. */
export async function disconnectPlayer() {
  if (player) {
    try { await player.disconnect() } catch {}
  }
  player = null
  deviceId = null
  readyPromise = null
}

// ── Stream Mode preference ──
const STREAM_MODE_KEY = 'soundswipe_stream_mode_v1'

export function isStreamModeOn() {
  try { return localStorage.getItem(STREAM_MODE_KEY) === 'on' } catch { return false }
}

export function setStreamMode(on) {
  try { localStorage.setItem(STREAM_MODE_KEY, on ? 'on' : 'off') } catch {}
}
