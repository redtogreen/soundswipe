/**
 * GET /api/artists?seed=Artist+One,Artist+Two&limit=20
 *   or  /api/artists?genre=indie-folk,dream-pop&limit=20  (fallback)
 *
 * Vercel serverless function — recommends artists via Last.fm.
 *
 * Why Last.fm: Spotify's Feb 2026 API restrictions removed similar-artists,
 * recommendations, and the popularity/followers fields. Last.fm still has
 * artist.getSimilar (true similarity scoring) and artist.getInfo (listener
 * counts), which lets us deliver the "discover emerging artists like the
 * ones you love" promise.
 *
 * The client (browser) then enriches each Last.fm artist with Spotify
 * search using the user's Authorization Code token — which DOES return
 * preview_url for tracks, unlike Client Credentials.
 *
 * Env vars required:
 *   LASTFM_API_KEY        - https://www.last.fm/api/account/create (free)
 *   LASTFM_MAX_LISTENERS  - optional, default 5000000 (filters out only the biggest mega-stars; size is not the mission, taste-match is)
 */

const MOCK_ARTISTS = [
  {
    id: 'mock-1', name: 'Mara Voss', genre: 'Indie Folk', location: 'Burlington, VT',
    bio: "Spinning stories out of Vermont winters. Fingerpicked guitar and hushed vocals since 2019.",
    fullBio: "Mara Voss started playing open mics at 19 and hasn't stopped.",
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&h=800&q=80',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    soundcloudUrl: null, spotifyUrl: null, trackName: 'January Light',
    followers: 892, popularity: 18, tags: ['indie-folk'],
  },
]

// ─── Last.fm integration ───────────────────────────────────────────────

const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/'

async function lastfmGetSimilar(artistName, apiKey, limit = 30) {
  const url = `${LASTFM_BASE}?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json&autocorrect=1&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) {
    console.log('[lastfm] getsimilar failed', { artistName, status: res.status })
    return []
  }
  const data = await res.json()
  if (data.error) {
    console.log('[lastfm] getsimilar error', { artistName, error: data.error, message: data.message })
    return []
  }
  return data.similarartists?.artist || []
}

async function lastfmGetInfo(artistName, apiKey) {
  const url = `${LASTFM_BASE}?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json&autocorrect=1`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  if (data.error) return null
  return data.artist || null
}

// Apple's iTunes Search API returns 30-second preview MP3s, requires no
// auth, no quota. Used because Spotify removed preview_url from their API
// in Feb 2026.
async function itunesFindPreview(artistName) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&limit=5&country=us`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const results = data.results || []
    // Prefer an exact artist name match
    const exact = results.find((t) =>
      (t.artistName || '').toLowerCase() === artistName.toLowerCase() && t.previewUrl
    )
    const picked = exact || results.find((t) => t.previewUrl) || results[0]
    if (!picked || !picked.previewUrl) return null
    return {
      previewUrl: picked.previewUrl,
      trackName: picked.trackName,
      itunesArtwork: picked.artworkUrl100
        ? picked.artworkUrl100.replace('100x100', '600x600')
        : null,
    }
  } catch {
    return null
  }
}

function pickImage(images) {
  if (!Array.isArray(images)) return null
  // Last.fm returns multiple image sizes; pick the largest non-empty one
  const order = ['mega', 'extralarge', 'large', 'medium', 'small']
  for (const size of order) {
    const found = images.find((i) => i.size === size && i['#text'])
    if (found) return found['#text']
  }
  return null
}

async function recommendFromLastfm(seedArtists, limit, maxListeners, apiKey) {
  console.log('[lastfm] start', { seedArtists, limit, maxListeners })

  // Step 1 — gather candidates from each seed artist (weighted by match score)
  const candidates = new Map() // name -> { score, image }
  const seedsToUse = seedArtists.slice(0, 8) // cap concurrent seeds to control quota
  await Promise.all(seedsToUse.map(async (seed) => {
    const similar = await lastfmGetSimilar(seed, apiKey, 25)
    for (const s of similar) {
      const name = s.name
      if (!name) continue
      const score = parseFloat(s.match) || 0
      const existing = candidates.get(name)
      if (!existing || score > existing.score) {
        candidates.set(name, { score, image: pickImage(s.image), seed })
      }
    }
  }))
  console.log('[lastfm] candidates gathered', { count: candidates.size })

  // Step 2 — sort by match score and enrich the top N with listener counts
  const sorted = [...candidates.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit * 3) // fetch 3x to allow filtering

  const results = []
  for (const [name, meta] of sorted) {
    if (results.length >= limit) break
    const info = await lastfmGetInfo(name, apiKey)
    if (!info) continue

    const listeners = parseInt(info.stats?.listeners || '0', 10)
    if (listeners >= maxListeners) continue
    if (listeners === 0) continue // filter out fake/duplicate entries

    const tags = (info.tags?.tag || []).map((t) => t.name).slice(0, 5)
    const bioSummary = (info.bio?.summary || '').replace(/<a[^>]*>.*?<\/a>/g, '').replace(/\s+Read more.*$/, '').trim()

    // Fetch a 30-second preview from Apple iTunes Search (Spotify killed
    // preview_url in Feb 2026). Run these in parallel after the loop for
    // speed — for now do it inline so we know to skip artists with no audio.
    const itunes = await itunesFindPreview(name)

    results.push({
      id: `lastfm-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      genre: tags[0] ? tags[0].replace(/\b\w/g, (c) => c.toUpperCase()) : 'Discovery',
      location: null,
      bio: bioSummary.slice(0, 200),
      fullBio: bioSummary,
      photo: meta.image || pickImage(info.image) || itunes?.itunesArtwork || null,
      previewUrl: itunes?.previewUrl || null,
      soundcloudUrl: null,
      spotifyUrl: null,
      spotifyTrackId: null,
      trackName: itunes?.trackName || null,
      followers: listeners,
      popularity: parseInt(info.stats?.playcount || '0', 10),
      tags,
      _seed: meta.seed,
      _match: meta.score,
    })
  }

  console.log('[lastfm] done', { totalResults: results.length })
  return results
}

// ─── Main handler ───────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  // Short cache so testing doesn't get stuck on stale data
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { seed = '', genre = '', limit = '20' } = req.query
  const seedArtists = seed ? seed.split(',').map((s) => s.trim()).filter(Boolean) : []
  const limitNum = Math.min(parseInt(limit, 10) || 20, 30)
  // Raised from 500K to 5M after the mission pivot — we no longer size-police
  // discoveries. The job is to surface the artists that match your taste most
  // precisely, regardless of how many people already know about them. The 5M
  // ceiling exists only to filter out the absolute biggest pop stars where
  // recommending them adds no discovery value.
  const maxListeners = parseInt(process.env.LASTFM_MAX_LISTENERS || '5000000', 10)

  const apiKey = process.env.LASTFM_API_KEY

  if (apiKey && seedArtists.length > 0) {
    try {
      const artists = await recommendFromLastfm(seedArtists, limitNum, maxListeners, apiKey)
      if (artists.length > 0) {
        return res.status(200).json({
          artists, source: 'lastfm',
          filters: { maxListeners },
        })
      }
    } catch (err) {
      console.error('Last.fm error:', err.message)
    }
  }

  // Fallback to mock
  return res.status(200).json({
    artists: MOCK_ARTISTS.slice(0, limitNum),
    source: 'mock',
    note: apiKey
      ? 'No seed artists provided — connect Spotify so we can use your top artists.'
      : 'Add LASTFM_API_KEY env var to enable real recommendations.',
  })
}
