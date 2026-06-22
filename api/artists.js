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
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    soundcloudUrl: null,
    spotifyUrl: null, trackName: 'January Light',
    followers: 892, popularity: 18, tags: ['indie-folk', 'singer-songwriter'],
  },
  {
    id: 'mock-2', name: 'The Copper Moths', genre: 'Indie Rock', location: 'Austin, TX',
    bio: 'Four friends making noise in a converted warehouse. Fuzzy guitars, driving rhythms.',
    fullBio: "The Copper Moths formed in 2021 after four college friends refused to let band practice end. Their sound sits between Parquet Courts and Palehound — angular, nervous, full of forward motion.",
    photo: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=600&h=800&q=80',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    soundcloudUrl: null,
    spotifyUrl: null, trackName: 'Neon Rust',
    followers: 3210, popularity: 24, tags: ['indie-rock', 'post-punk'],
  },
  {
    id: 'mock-3', name: 'June Caraway', genre: 'Singer-Songwriter', location: 'Nashville, TN',
    bio: "Alt-country confessionals that don't fit any radio format — which is the whole point.",
    fullBio: "June Caraway moved to Nashville from rural Kentucky at 22 with a suitcase and a Telecaster. Her songs are country-adjacent confessionals — think Phoebe Bridgers covering Loretta Lynn with a distortion pedal.",
    photo: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=600&h=800&q=80',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    soundcloudUrl: null,
    spotifyUrl: null, trackName: 'Dust & Wire',
    followers: 1450, popularity: 21, tags: ['singer-songwriter', 'alt-country'],
  },
  {
    id: 'mock-4', name: 'Drift Theory', genre: 'Dream Pop', location: 'Seattle, WA',
    bio: "Reverb-drenched vocals and shimmering synths built for the hour before sunrise.",
    fullBio: "Drift Theory is the solo project of Noa Hendricks, a 24-year-old producer who layers gauzy vocals over cavernous, slow-burning electronic textures. Influenced equally by Beach House and Burial.",
    photo: 'https://images.unsplash.com/photo-1499540633125-484965b60031?auto=format&fit=crop&w=600&h=800&q=80',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    soundcloudUrl: null,
    spotifyUrl: null, trackName: 'Coastline',
    followers: 2780, popularity: 22, tags: ['dream-pop', 'shoegaze', 'electronic'],
  },
  {
    id: 'mock-5', name: 'Ella Soto', genre: 'R&B / Soul', location: 'Atlanta, GA',
    bio: "Church harmonies met late-night R&B when Ella was 16. Her voice does things producers twice her age can't explain.",
    fullBio: "Ella Soto grew up singing in her grandmother's church in Decatur. The collision of gospel harmony and after-hours R&B is right there in every note she sings. At 22, she's released two EPs independently.",
    photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&h=800&q=80',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    soundcloudUrl: null,
    spotifyUrl: null, trackName: 'Still Here',
    followers: 4200, popularity: 28, tags: ['r-b', 'soul'],
  },
  {
    id: 'mock-6', name: 'Phantom Pines', genre: 'Lo-Fi', location: 'Portland, OR',
    bio: "Beats that sound like they were recorded through a sweater. Lo-fi hip hop for people tired of lo-fi hip hop.",
    fullBio: "Phantom Pines is producer Theo Marsh's alias. His self-described 'sad-boy boom-bap' blends dusty samples, muffled drums, and occasional spoken word into something too restless to be background music.",
    photo: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&h=800&q=80',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    soundcloudUrl: null,
    spotifyUrl: null, trackName: 'Cedar & Fog',
    followers: 1900, popularity: 19, tags: ['lo-fi', 'hip-hop'],
  },
  {
    id: 'mock-7', name: 'Neon Cactus', genre: 'Electronic', location: 'Phoenix, AZ',
    bio: "Club music made for a desert that doesn't have clubs. Equal parts sweat, heat, and neon-lit longing.",
    fullBio: "Neon Cactus emerged from the Phoenix underground party scene in 2022, throwing DIY raves in industrial spaces. The project, helmed by producer Ria Castillo, draws on her Mexican-American heritage and the kinetic energy of underground dance music.",
    photo: 'https://images.unsplash.com/photo-1483786160059-d3aa9c4ad9d8?auto=format&fit=crop&w=600&h=800&q=80',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    soundcloudUrl: null,
    spotifyUrl: null, trackName: 'Desert Mode',
    followers: 3870, popularity: 26, tags: ['electronic', 'dance'],
  },
  {
    id: 'mock-8', name: 'Oliver Fray', genre: 'Folk', location: 'Asheville, NC',
    bio: "Old-time Appalachian picking meets contemporary folk storytelling. Sounds like he arrived from 1972.",
    fullBio: "Oliver Fray learned banjo from a neighbor at age 12 in rural western North Carolina. His fingerpicking merges Appalachian old-time with the introspective songwriting of the contemporary folk revival. He records in an analog studio in Black Mountain.",
    photo: 'https://images.unsplash.com/photo-1500522144261-ea64433bbe27?auto=format&fit=crop&w=600&h=800&q=80',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    soundcloudUrl: null,
    spotifyUrl: null, trackName: 'Blue Ridge Morning',
    followers: 670, popularity: 14, tags: ['folk', 'americana'],
  },
  {
    id: 'mock-9', name: 'Still Waters', genre: 'Dream Pop', location: 'Brooklyn, NY',
    bio: "The kind of band that sounds better at 2am. Walls of guitar, delayed vocals, rhythms that pull rather than push.",
    fullBio: "Still Waters formed when two ex-members of separate Brooklyn noise bands decided to make something people could actually hear across a room. Densely layered dream pop built around intertwined guitars, softly buried vocals.",
    photo: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&h=800&q=80',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    soundcloudUrl: null,
    spotifyUrl: null, trackName: 'Pale Signal',
    followers: 2100, popularity: 23, tags: ['dream-pop', 'shoegaze'],
  },
  {
    id: 'mock-10', name: 'Tana Bright', genre: 'Indie Folk', location: 'Denver, CO',
    bio: "High-altitude folk with a low-key disposition. Tana writes songs about mountains and mistakes with equal awe.",
    fullBio: "Tana Bright has been playing music in Colorado for six years, starting as a teenager at the Telluride Folk Festival. Her voice sits in a warm middle register and her lyrics have a plainspoken honesty that eschews easy metaphor.",
    photo: 'https://images.unsplash.com/photo-1492447216082-4726bf04d1d3?auto=format&fit=crop&w=600&h=800&q=80',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    soundcloudUrl: null,
    spotifyUrl: null, trackName: 'Altitude',
    followers: 1100, popularity: 17, tags: ['indie-folk', 'singer-songwriter'],
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
  console.log('[spotify] fetchFromSpotify start', { genres, limit, maxFollowers, maxPopularity })
  const token = await getSpotifyToken(clientId, clientSecret)
  const results = []
  const seen = new Set()

  // Cap how many artists we take from each genre so the queue mirrors the
  // user's taste distribution instead of being all from their #1 genre.
  // First genres in the list are weighted highest (frontend sorts), so
  // they get queried first and get whatever the cap allows.
  const perGenreCap = Math.max(2, Math.ceil(limit / Math.min(genres.length || 1, 6)))

  for (const genreKey of genres) {
    const spotifyGenre = GENRE_MAP[genreKey] || genreKey.replace(/-/g, ' ')
    // Spotify removed the `genre:"..."` filter syntax in their 2026 API
    // changes. Use plain-text genre search and match against each
    // artist's own genres array instead.
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(spotifyGenre)}&type=artist&limit=20&market=US`

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!searchRes.ok) {
      let errorBody = ''
      try { errorBody = await searchRes.text() } catch {}
      console.log('[spotify] search failed', { genreKey, url: searchUrl, status: searchRes.status, body: errorBody })
      continue
    }
    const searchData = await searchRes.json()
    const artists = searchData.artists?.items || []
    console.log('[spotify] search results', { genreKey, spotifyGenre, artistCount: artists.length, samplePopularity: artists.slice(0, 5).map(a => ({ name: a.name, pop: a.popularity, foll: a.followers?.total, genres: a.genres })) })

    let takenFromThisGenre = 0
    let rejectedByGenre = 0
    let rejectedByFollowers = 0
    let rejectedByPopularity = 0
    let rejectedByImages = 0

    const genreLower = spotifyGenre.toLowerCase()

    for (const a of artists) {
      if (seen.has(a.id)) continue
      seen.add(a.id)

      // Confirm the artist actually belongs to this genre (text search may
      // return false matches against artist name, etc.).
      const artistGenres = (a.genres || []).map((g) => g.toLowerCase())
      const matchesGenre = artistGenres.some((g) => g.includes(genreLower) || genreLower.includes(g))
      if (!matchesGenre) { rejectedByGenre++; continue }

      // BOTH filters must pass: followers AND popularity
      if (a.followers?.total >= maxFollowers) { rejectedByFollowers++; continue }
      if (a.popularity >= maxPopularity) { rejectedByPopularity++; continue }
      if (!a.images?.length) { rejectedByImages++; continue }

      // Find a representative track via search (the /artists/{id}/top-tracks
      // endpoint was deprecated by Spotify in Feb 2026).
      let track = null
      try {
        const q = encodeURIComponent(`artist:"${a.name}"`)
        const trackRes = await fetch(
          `https://api.spotify.com/v1/search?q=${q}&type=track&limit=5&market=US`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (trackRes.ok) {
          const trackData = await trackRes.json()
          const tracks = trackData.tracks?.items || []
          // Prefer tracks that are actually by this artist and have a preview
          const byThisArtist = tracks.filter((t) =>
            t.artists?.some((ar) => ar.id === a.id)
          )
          track = byThisArtist.find((t) => t.preview_url)
                || byThisArtist[0]
                || tracks.find((t) => t.preview_url)
                || tracks[0]
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

      takenFromThisGenre += 1
      if (takenFromThisGenre >= perGenreCap) break
      if (results.length >= limit) break
    }
    console.log('[spotify] genre done', { genreKey, taken: takenFromThisGenre, rejectedByGenre, rejectedByFollowers, rejectedByPopularity, rejectedByImages, totalResults: results.length })
    if (results.length >= limit) break
  }

  console.log('[spotify] fetchFromSpotify done', { totalResults: results.length })
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
