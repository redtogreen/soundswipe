/**
 * GET /api/artists?genre=indie-folk,dream-pop&limit=20
 *
 * Vercel serverless function — returns a list of emerging Spotify artists.
 *
 * ── Behavior ──────────────────────────────────────────────────────────
 * • If SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET are set, fetches live
 *   artists from Spotify Web API, filtered by followers AND popularity.
 * • Otherwise returns hardcoded mock data so the frontend works without
 *   credentials.
 *
 * ── To activate live data ─────────────────────────────────────────────
 * 1. Create an app at https://developer.spotify.com/dashboard
 * 2. Add to env vars (local .env and Vercel project settings):
 *      SPOTIFY_CLIENT_ID
 *      SPOTIFY_CLIENT_SECRET
 *      SPOTIFY_MAX_FOLLOWERS    (default 10000)
 *      SPOTIFY_MAX_POPULARITY   (default 35)
 * 3. Redeploy.
 */

const MOCK_ARTISTS = [
  {
    id: 'mock-1', name: 'Mara Voss', genre: 'Indie Folk', location: 'Burlington, VT',
    bio: "Spinning stories out of Vermont winters. Fingerpicked guitar and hushed vocals since 2019.",
    fullBio: "Mara Voss started playing open mics at 19 and hasn't stopped. Her fingerpicked guitar and hushed vocals draw comparisons to Adrianne Lenker and Hand Habits — intimate, spare, and alive with small-town detail.",
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&h=800&q=80',
    previewUrl: null, soundcloudUrl: 'https://soundcloud.com/forss/flickermood',
    spotifyUrl: null, trackName: 'January Light',
    followers: 892, popularity: 18, tags: ['indie-folk', 'singer-songwriter'],
  },
  {
    id: 'mock-2', name: 'The Copper Moths', genre: 'Indie Rock', location: 'Austin, TX',
    bio: 'Four friends making noise in a converted warehouse. Fuzzy guitars, driving rhythms.',
    fullBio: "The Copper Moths formed in 2021 after four college friends refused to let band practice end. Their sound sits between Parquet Courts and Palehound — angular, nervous, full of forward motion.",
    photo: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=600&h=800&q=80',
    previewUrl: null, soundcloudUrl: 'https://soundcloud.com/forss/flickermood',
    spotifyUrl: null, trackName: 'Neon Rust',
    followers: 3210, popularity: 24, tags: ['indie-rock', 'post-punk'],
  },
  {
    id: 'mock-3', name: 'June Caraway', genre: 'Singer-Songwriter', location: 'Nashville, TN',
    bio: "Alt-country confessionals that don't fit any radio format — which is the whole point.",
    fullBio: "June Caraway moved to Nashville from rural Kentucky at 22 with a suitcase and a Telecaster. Her songs are country-adjacent confessionals — think Phoebe Bridgers covering Loretta Lynn with a distortion pedal.",
    photo: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=600&h=800&q=80',
    previewUrl: null, soundcloudUrl: 'https://soundcloud.com/forss/flickermood',
    spotifyUrl: null, trackName: 'Dust & Wire',
    followers: 1450, popularity: 21, tags: ['singer-songwriter', 'alt-country'],
  },
]

// ── Spotify Web API integration ────────────────────────────────────────
const GENRE_MAP = {
  'indie-folk':        'indie folk',
  'dream-pop':         'dream pop',
  'indie-rock':        'indie rock',
  'r-b':               'r&b',
  'singer-songwriter': 'singer-songwriter',
  'lo-fi':             'lo-fi',
  'electronic':        'electronic',
  'folk':              'folk',
  'shoegaze':          'shoegaze',
  'americana':         'americana',
}

function toTitleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

async function getSpotifyToken(clientId, clientSecret) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Spotify token error: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

async function fetchFromSpotify(genres, limit, maxFollowers, maxPopularity, clientId, clientSecret) {
  const token = await getSpotifyToken(clientId, clientSecret)
  const results = []
  const seen = new Set()

  for (const genreKey of genres) {
    const spotifyGenre = GENRE_MAP[genreKey] || genreKey.replace(/-/g, ' ')
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(`genre:"${spotifyGenre}"`)}&type=artist&limit=50&market=US`

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!searchRes.ok) continue
    const searchData = await searchRes.json()
    const artists = searchData.artists?.items || []

    for (const a of artists) {
      if (seen.has(a.id)) continue
      seen.add(a.id)

      // BOTH filters must pass: followers AND popularity
      if (a.followers?.total >= maxFollowers) continue
      if (a.popularity >= maxPopularity) continue
      if (!a.images?.length) continue

      // Fetch top track for preview URL
      let track = null
      try {
        const trackRes = await fetch(
          `https://api.spotify.com/v1/artists/${a.id}/top-tracks?market=US`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (trackRes.ok) {
          const trackData = await trackRes.json()
          const tracks = trackData.tracks || []
          // Prefer tracks with preview_url (some Spotify tracks don't have one)
          track = tracks.find((t) => t.preview_url) || tracks[0]
        }
      } catch { /* skip */ }
      if (!track) continue

      results.push({
        id: a.id,
        name: a.name,
        genre: toTitleCase(spotifyGenre),
        location: null,                              // Spotify API doesn't return location
        bio: '',                                     // Spotify API doesn't return bio
        fullBio: '',
        photo: a.images[0].url,
        previewUrl: track.preview_url || null,       // 30-second MP3
        soundcloudUrl: null,
        spotifyUrl: a.external_urls?.spotify || null,
        spotifyTrackId: track.id,
        trackName: track.name,
        followers: a.followers?.total ?? 0,
        popularity: a.popularity ?? 0,
        tags: (a.genres || []).slice(0, 5),
      })

      if (results.length >= limit) break
    }
    if (results.length >= limit) break
  }

  return results
}

// ── Main handler ───────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { genre = '', limit = '20' } = req.query
  const genres = genre ? genre.split(',').map((g) => g.trim()).filter(Boolean) : []
  const limitNum = Math.min(parseInt(limit, 10) || 20, 50)
  const maxFollowers = parseInt(process.env.SPOTIFY_MAX_FOLLOWERS || '10000', 10)
  const maxPopularity = parseInt(process.env.SPOTIFY_MAX_POPULARITY || '35', 10)

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (clientId && clientSecret) {
    try {
      const artists = await fetchFromSpotify(
        genres.length ? genres : Object.keys(GENRE_MAP),
        limitNum, maxFollowers, maxPopularity, clientId, clientSecret
      )
      if (artists.length) {
        return res.status(200).json({
          artists, source: 'spotify',
          filters: { maxFollowers, maxPopularity },
        })
      }
    } catch (err) {
      console.error('Spotify API error:', err.message)
      // Fall through to mock
    }
  }

  const filtered = genres.length
    ? MOCK_ARTISTS.filter((a) => a.tags?.some((t) => genres.includes(t)))
    : MOCK_ARTISTS
  const artists = filtered.length ? filtered : MOCK_ARTISTS

  return res.status(200).json({
    artists: artists.slice(0, limitNum),
    source: 'mock',
    note: 'Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET env vars to enable live Spotify data.',
  })
}
