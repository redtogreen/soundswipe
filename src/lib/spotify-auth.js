// Spotify OAuth (Authorization Code Flow with PKCE) — client-side, no server secret.
// Stores tokens in localStorage. Suitable for the prototype; production would
// proxy server-side.

const AUTH_KEY = 'spotify_auth_v1'
const VERIFIER_KEY = 'spotify_pkce_verifier'

// Scopes — read profile, write playlists, read top artists. If you change
// this list, existing users will need to reconnect (show_dialog=true ensures
// Spotify prompts for the new permissions).
const SCOPES = 'user-read-private user-read-email user-top-read playlist-modify-public playlist-modify-private'

const RETURN_TO_KEY = 'spotify_return_to'

function redirectUri() {
  return `${window.location.origin}/callback`
}

function base64url(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function generateCodeVerifier(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let out = ''
  const arr = new Uint32Array(length)
  crypto.getRandomValues(arr)
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length]
  return out
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64url(hash)
}

export function getClientId() {
  return import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
}

export function isConfigured() {
  return Boolean(getClientId())
}

export async function beginAuth(returnTo = null) {
  const clientId = getClientId()
  if (!clientId) throw new Error('VITE_SPOTIFY_CLIENT_ID not set')
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  if (returnTo) sessionStorage.setItem(RETURN_TO_KEY, returnTo)
  else sessionStorage.removeItem(RETURN_TO_KEY)

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    // Force Spotify to show the consent screen every time so newly-added
    // scopes are visible and re-grantable (otherwise Spotify silently
    // reuses the previous consent and the new scopes aren't actually granted).
    show_dialog: 'true',
  })
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
}

export async function handleRedirect() {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY)
  if (error) {
    sessionStorage.removeItem(VERIFIER_KEY)
    sessionStorage.removeItem(RETURN_TO_KEY)
    window.history.replaceState({}, '', '/')
    return { ok: false, error, returnTo }
  }
  if (!code) return null

  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!verifier) {
    sessionStorage.removeItem(RETURN_TO_KEY)
    window.history.replaceState({}, '', '/')
    return { ok: false, error: 'missing_verifier', returnTo }
  }

  const clientId = getClientId()
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  })

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  sessionStorage.removeItem(VERIFIER_KEY)
  sessionStorage.removeItem(RETURN_TO_KEY)
  window.history.replaceState({}, '', '/')
  if (!tokenRes.ok) return { ok: false, error: 'token_exchange_failed', returnTo }

  const tokens = await tokenRes.json()

  // Fetch the user's profile to display their name on Saved screen
  let profile = null
  try {
    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (profileRes.ok) profile = await profileRes.json()
  } catch { /* non-fatal */ }

  const auth = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + (tokens.expires_in - 60) * 1000, // 1-min buffer
    profile: profile && {
      id: profile.id,
      displayName: profile.display_name || profile.id,
      email: profile.email,
      image: profile.images?.[0]?.url || null,
    },
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
  return { ok: true, auth, returnTo }
}

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY)
}

export async function refreshAccessToken() {
  const stored = getStoredAuth()
  if (!stored?.refreshToken) return null
  const clientId = getClientId()
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: stored.refreshToken,
  })
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) return null
  const tokens = await res.json()
  const next = {
    ...stored,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || stored.refreshToken,
    expiresAt: Date.now() + (tokens.expires_in - 60) * 1000,
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(next))
  return next
}

export function isExpired(auth) {
  if (!auth?.expiresAt) return true
  return Date.now() >= auth.expiresAt
}
