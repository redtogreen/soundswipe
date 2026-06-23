// YouTube auth via Google Identity Services (GIS) + YouTube Data API v3.
//
// SETUP REQUIRED (Justin):
//   1. Create a Google Cloud project — https://console.cloud.google.com
//      (free, no credit card required)
//   2. Enable APIs & Services → YouTube Data API v3
//   3. Create OAuth 2.0 Client ID (type: Web application)
//      - Authorized JavaScript origins:
//          https://soundswipe-pink.vercel.app
//          http://localhost:5173  (for local dev)
//      - Authorized redirect URIs: (leave empty — we use implicit token flow)
//   4. Add to Vercel env vars:
//        VITE_GOOGLE_CLIENT_ID=<the .apps.googleusercontent.com client ID>
//   5. Add same VITE_GOOGLE_CLIENT_ID to .env.local for local dev
//   6. Redeploy.
//
// QUOTA: The YouTube Data API free tier is 10,000 units/day.
//   - Search call (to find an artist's channel): 100 units
//   - Subscription insert: 50 units
//   - So ~66 unique saves/day max before hitting quota.
//   - For production scale, request a quota increase via Google Cloud console
//     (typically granted within a week for legit apps).

const AUTH_KEY = 'youtube_auth_v1'
const SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl'

let gisLoadPromise = null

function loadGoogleIdentityServices() {
  if (gisLoadPromise) return gisLoadPromise
  gisLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve(window.google.accounts)
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google.accounts)
    script.onerror = () => reject(new Error('Google Identity Services failed to load'))
    document.body.appendChild(script)
  })
  return gisLoadPromise
}

export function isYouTubeConfigured() {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
}

/** Trigger Google sign-in popup, request YouTube scope, store access token. */
export async function authorizeYouTube() {
  if (!isYouTubeConfigured()) {
    throw new Error('Google client ID not configured')
  }
  const accounts = await loadGoogleIdentityServices()
  return new Promise((resolve, reject) => {
    const tokenClient = accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error) return reject(new Error(response.error))
        const auth = {
          accessToken: response.access_token,
          expiresAt: Date.now() + (response.expires_in - 60) * 1000, // 1-min buffer
          connectedAt: Date.now(),
        }
        saveYouTubeAuth(auth)
        resolve(auth)
      },
      error_callback: (err) => reject(new Error(err?.type || 'oauth_error')),
    })
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

export function getStoredYouTubeAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveYouTubeAuth(auth) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(auth)) } catch {}
}

export function clearYouTubeAuth() {
  localStorage.removeItem(AUTH_KEY)
}

export function isYouTubeAuthValid(auth) {
  if (!auth?.accessToken) return false
  if (!auth?.expiresAt) return false
  return Date.now() < auth.expiresAt
}

/**
 * Subscribe to an artist's YouTube channel.
 * Looks up the channel by name (preferring "official" channels), then calls
 * youtube.subscriptions.insert.
 *
 * Returns { ok: true, channelId } on success
 * or { ok: false, reason } on failure.
 */
export async function subscribeToArtistChannel(artistName) {
  const auth = getStoredYouTubeAuth()
  if (!isYouTubeAuthValid(auth)) {
    return { ok: false, reason: 'not_authorized' }
  }

  try {
    // Search for the artist's channel
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.set('part', 'snippet')
    searchUrl.searchParams.set('q', `${artistName} official artist channel`)
    searchUrl.searchParams.set('type', 'channel')
    searchUrl.searchParams.set('maxResults', '1')

    const searchRes = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
    if (searchRes.status === 401) return { ok: false, reason: 'token_expired' }
    if (searchRes.status === 403) return { ok: false, reason: 'quota_exceeded' }
    if (!searchRes.ok) return { ok: false, reason: `search_${searchRes.status}` }

    const searchData = await searchRes.json()
    const channelId =
      searchData.items?.[0]?.snippet?.channelId ||
      searchData.items?.[0]?.id?.channelId
    if (!channelId) return { ok: false, reason: 'not_found' }

    // Subscribe to the channel
    const subRes = await fetch(
      'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            resourceId: { kind: 'youtube#channel', channelId },
          },
        }),
      }
    )
    // 409 = already subscribed (treat as success)
    if (subRes.status === 409) return { ok: true, channelId, alreadySubscribed: true }
    if (subRes.status === 401) return { ok: false, reason: 'token_expired' }
    if (subRes.status === 403) return { ok: false, reason: 'quota_exceeded' }
    if (!subRes.ok) return { ok: false, reason: `subscribe_${subRes.status}` }

    return { ok: true, channelId }
  } catch (err) {
    return { ok: false, reason: err?.message || 'unknown' }
  }
}
