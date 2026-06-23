// Apple Music auth via MusicKit JS v3.
//
// SETUP REQUIRED (Justin):
//   1. Apple Developer account ($99/year) — https://developer.apple.com/programs
//   2. Generate a MusicKit developer token. This is a JWT signed with an
//      Apple Developer private key (.p8 file). Tokens expire after ~6 months.
//      Either:
//        - Generate one locally and rotate manually, OR
//        - Build a Vercel serverless function that signs tokens on demand
//   3. Add to Vercel env vars (Sensitive):
//        VITE_APPLE_MUSIC_DEVELOPER_TOKEN=<the JWT>
//   4. Redeploy.
//
// Once configured, save flow auto-adds the artist to the user's Apple Music
// library (Apple's equivalent of "follow"). Until configured, the save flow
// silently skips Apple Music.

const AUTH_KEY = 'apple_music_auth_v1'
const MUSICKIT_SRC = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'

let musicKitLoadPromise = null
let configurePromise = null

function loadMusicKit() {
  if (musicKitLoadPromise) return musicKitLoadPromise
  musicKitLoadPromise = new Promise((resolve, reject) => {
    if (window.MusicKit) return resolve(window.MusicKit)
    // MusicKit fires 'musickitloaded' on the document when ready.
    const onReady = () => resolve(window.MusicKit)
    document.addEventListener('musickitloaded', onReady, { once: true })
    const script = document.createElement('script')
    script.src = MUSICKIT_SRC
    script.async = true
    script.onerror = () => reject(new Error('MusicKit failed to load'))
    document.body.appendChild(script)
  })
  return musicKitLoadPromise
}

export function isAppleMusicConfigured() {
  return Boolean(import.meta.env.VITE_APPLE_MUSIC_DEVELOPER_TOKEN)
}

export async function configureMusicKit() {
  if (configurePromise) return configurePromise
  configurePromise = (async () => {
    const MusicKit = await loadMusicKit()
    await MusicKit.configure({
      developerToken: import.meta.env.VITE_APPLE_MUSIC_DEVELOPER_TOKEN,
      app: { name: 'SoundSwipe', build: '1.0.0' },
    })
    return MusicKit.getInstance()
  })()
  return configurePromise
}

/** Trigger Apple Music auth dialog. User picks an Apple ID and confirms scope. */
export async function authorizeAppleMusic() {
  if (!isAppleMusicConfigured()) {
    throw new Error('Apple Music developer token not configured')
  }
  const music = await configureMusicKit()
  await music.authorize()
  const auth = {
    authorized: true,
    musicUserToken: music.musicUserToken,
    storefrontId: music.storefrontId,
    connectedAt: Date.now(),
  }
  saveAppleAuth(auth)
  return auth
}

export function getStoredAppleAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveAppleAuth(auth) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(auth)) } catch {}
}

export async function clearAppleAuth() {
  localStorage.removeItem(AUTH_KEY)
  try {
    const music = await configureMusicKit()
    await music.unauthorize()
  } catch { /* ignore */ }
}

/**
 * Add an artist to the user's Apple Music library — the platform's
 * equivalent of "follow." Searches the catalog by name, takes the top
 * result, adds it to the library.
 *
 * Returns { ok: true, appleArtistId } on success
 * or { ok: false, reason } on failure.
 */
export async function addAppleArtistToLibrary(artistName) {
  if (!isAppleMusicConfigured()) {
    return { ok: false, reason: 'not_configured' }
  }
  try {
    const music = await configureMusicKit()
    if (!music.isAuthorized) {
      return { ok: false, reason: 'not_authorized' }
    }
    const storefront = music.storefrontId || 'us'

    // Search the catalog for the artist
    const search = await music.api.music(
      `/v1/catalog/${storefront}/search`,
      { term: artistName, types: 'artists', limit: 1 }
    )
    const artist = search?.data?.results?.artists?.data?.[0]
    if (!artist) return { ok: false, reason: 'not_found' }

    // Add to library
    await music.api.music(
      '/v1/me/library',
      undefined,
      {
        fetchOptions: {
          method: 'POST',
          body: JSON.stringify({ ids: { artists: [artist.id] } }),
          headers: { 'Content-Type': 'application/json' },
        },
      }
    )
    return {
      ok: true,
      appleArtistId: artist.id,
      appleUrl: artist.attributes?.url || null,
    }
  } catch (err) {
    return { ok: false, reason: err?.message || 'unknown' }
  }
}
