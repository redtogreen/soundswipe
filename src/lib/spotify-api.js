// Client-side Spotify Web API helpers. Uses the user's access token
// (from spotify-auth.js) to act on their account.

import { getStoredAuth, refreshAccessToken, isExpired } from './spotify-auth.js'

async function getValidToken() {
  let auth = getStoredAuth()
  if (!auth) throw new Error('Not connected to Spotify')
  if (isExpired(auth)) {
    const refreshed = await refreshAccessToken()
    if (!refreshed) throw new Error('Session expired — please reconnect Spotify')
    auth = refreshed
  }
  return { token: auth.accessToken, userId: auth.profile?.id }
}

class InsufficientScopeError extends Error {
  constructor() {
    super('Spotify hasn’t granted playlist permissions yet. Disconnect and reconnect to allow them.')
    this.code = 'insufficient_scope'
  }
}

async function searchTopTrackUri(artistName, token) {
  const q = encodeURIComponent(`artist:"${artistName}"`)
  const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1&market=US`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.tracks?.items?.[0]?.uri || null
}

/**
 * Create a Spotify playlist from a list of saved artists.
 * For each artist, looks up the top track and adds it.
 *
 * Returns { playlist, addedCount, missed } where:
 *   playlist  – the Spotify playlist object (has external_urls.spotify)
 *   addedCount – number of tracks added
 *   missed     – names of artists Spotify couldn't resolve
 */
export async function createPlaylistFromFinds(finds, opts = {}) {
  const name = opts.name || 'SoundSwipe Finds'
  const description = opts.description || 'Discovered with SoundSwipe — the music the algorithms missed.'

  const { token, userId } = await getValidToken()
  if (!userId) throw new Error('Missing Spotify user id')

  // Resolve each artist to a Spotify track URI
  const uris = []
  const missed = []
  for (const artist of finds) {
    let uri = null
    if (artist.spotifyTrackId) uri = `spotify:track:${artist.spotifyTrackId}`
    else uri = await searchTopTrackUri(artist.name, token)
    if (uri) uris.push(uri)
    else missed.push(artist.name)
  }

  if (uris.length === 0) {
    throw new Error('Couldn’t find any of these artists on Spotify')
  }

  // Create the playlist
  const createRes = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, description, public: false }),
  })

  if (createRes.status === 401 || createRes.status === 403) {
    throw new InsufficientScopeError()
  }
  if (!createRes.ok) throw new Error(`Couldn’t create playlist (${createRes.status})`)
  const playlist = await createRes.json()

  // Add tracks in batches of 100 (Spotify limit)
  for (let i = 0; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100)
    const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: batch }),
    })
    if (!addRes.ok) {
      throw new Error('Playlist created but couldn’t add all tracks — open Spotify and try again')
    }
  }

  return { playlist, addedCount: uris.length, missed }
}

// ─── Read side: pull user's existing playlists ─────────────────────────

export async function getMyPlaylists(limit = 50) {
  const { token } = await getValidToken()
  const res = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401 || res.status === 403) throw new InsufficientScopeError()
  if (!res.ok) throw new Error(`Couldn't load playlists (${res.status})`)
  const data = await res.json()
  return (data.items || []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    image: p.images?.[0]?.url || null,
    trackCount: p.tracks?.total || 0,
    owner: p.owner?.display_name || p.owner?.id,
    isOwn: p.owner?.id ? true : false,
    url: p.external_urls?.spotify,
  }))
}

export async function getPlaylistTracks(playlistId, limit = 100) {
  const { token } = await getValidToken()
  const fields = 'items(track(id,name,uri,artists(id,name),album(images)))'
  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&fields=${encodeURIComponent(fields)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (res.status === 401 || res.status === 403) throw new InsufficientScopeError()
  if (!res.ok) throw new Error(`Couldn't load playlist tracks (${res.status})`)
  const data = await res.json()

  // Group by artist — one artist per row, with their first track
  const seen = new Set()
  const artists = []
  for (const item of data.items || []) {
    const t = item.track
    if (!t) continue
    const primary = t.artists?.[0]
    if (!primary || seen.has(primary.id)) continue
    seen.add(primary.id)
    artists.push({
      id: `imported-${primary.id}`,
      name: primary.name,
      genre: 'Imported',
      location: null,
      bio: '',
      fullBio: '',
      photo: t.album?.images?.[0]?.url || null,
      previewUrl: null,
      soundcloudUrl: null,
      spotifyUrl: `https://open.spotify.com/artist/${primary.id}`,
      spotifyTrackId: t.id,
      trackName: t.name,
      followers: 0,
      popularity: 0,
      tags: [],
    })
  }
  return artists
}

// ─── Update existing playlist (replace tracks) ─────────────────────────

export async function syncPlaylist(playlistId, finds) {
  const { token } = await getValidToken()

  // Resolve each artist to a Spotify track URI
  const uris = []
  const missed = []
  for (const artist of finds) {
    let uri = null
    if (artist.spotifyTrackId) uri = `spotify:track:${artist.spotifyTrackId}`
    else uri = await searchTopTrackUri(artist.name, token)
    if (uri) uris.push(uri)
    else missed.push(artist.name)
  }

  if (uris.length === 0) {
    throw new Error('Couldn’t find any of these artists on Spotify')
  }

  // Replace tracks (PUT replaces, POST appends — we use PUT for clean sync)
  const firstBatch = uris.slice(0, 100)
  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris: firstBatch }),
  })
  if (res.status === 401 || res.status === 403) throw new InsufficientScopeError()
  if (!res.ok) throw new Error(`Couldn’t update playlist (${res.status})`)

  // Append any beyond 100
  for (let i = 100; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100)
    const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: batch }),
    })
    if (!addRes.ok) throw new Error('Couldn’t add all tracks')
  }

  return { addedCount: uris.length, missed }
}

export { InsufficientScopeError }
