/**
 * GET /api/artists?genre=indie-folk,dream-pop&limit=20
 *
 * Vercel serverless function — returns a list of independent artists.
 *
 * ── Behavior ──────────────────────────────────────────────────────────
 * • If SOUNDCLOUD_CLIENT_ID is set in env vars, fetches real artists from
 *   the SoundCloud API filtered by follower threshold.
 * • Otherwise returns hardcoded placeholder data so the frontend works
 *   immediately without credentials.
 *
 * ── To activate real SoundCloud data ──────────────────────────────────
 * 1. Create an app at https://soundcloud.com/you/apps/new
 * 2. Add SOUNDCLOUD_CLIENT_ID and SOUNDCLOUD_CLIENT_SECRET to your
 *    Vercel project's environment variables (Settings → Environment Variables)
 * 3. Redeploy — the API will automatically switch to live data.
 */

const MOCK_ARTISTS = [
  {
    id: 1,
    name: 'Mara Voss',
    genre: 'Indie Folk',
    location: 'Burlington, VT',
    bio: "Spinning stories out of Vermont winters. Mara's fingerpicked guitar and hushed vocals have quietly won over coffeehouse crowds since 2019.",
    fullBio: "Spinning stories out of Vermont winters and late-night drives, Mara Voss started playing open mics at 19 and hasn't stopped. Her fingerpicked guitar and hushed vocals draw comparisons to Adrianne Lenker and Hand Habits — intimate, spare, and alive with small-town detail.",
    photo: 'https://picsum.photos/seed/mara-voss/400/560',
    soundcloudUrl: 'https://soundcloud.com/forss/flickermood',
    trackName: 'January Light',
    followers: 892,
    tags: ['indie-folk', 'acoustic', 'singer-songwriter'],
  },
  {
    id: 2,
    name: 'The Copper Moths',
    genre: 'Indie Rock',
    location: 'Austin, TX',
    bio: 'Four friends making noise in a converted warehouse. Fuzzy guitars, driving rhythms, and lyrics about staying up too late.',
    fullBio: "The Copper Moths formed in 2021 after four college friends refused to let band practice end when the lease expired. Their sound sits between Parquet Courts and Palehound — angular, nervous, full of forward motion.",
    photo: 'https://picsum.photos/seed/copper-moths/400/560',
    soundcloudUrl: 'https://soundcloud.com/forss/flickermood',
    trackName: 'Neon Rust',
    followers: 3210,
    tags: ['indie-rock', 'post-punk'],
  },
  {
    id: 3,
    name: 'June Caraway',
    genre: 'Singer-Songwriter',
    location: 'Nashville, TN',
    bio: "Not the Nashville you're thinking of. June writes alt-country confessionals that don't fit any radio format — which is the whole point.",
    fullBio: "June Caraway moved to Nashville from rural Kentucky at 22 with a suitcase and a Telecaster. Her songs are country-adjacent confessionals with an alt-rock edge — think Phoebe Bridgers covering Loretta Lynn with a distortion pedal.",
    photo: 'https://picsum.photos/seed/june-caraway/400/560',
    soundcloudUrl: 'https://soundcloud.com/forss/flickermood',
    trackName: 'Dust & Wire',
    followers: 1450,
    tags: ['singer-songwriter', 'alt-country'],
  },
  {
    id: 4,
    name: 'Drift Theory',
    genre: 'Dream Pop',
    location: 'Seattle, WA',
    bio: "Reverb-drenched vocals and shimmering synths built for the hour before sunrise.",
    fullBio: "Drift Theory is the solo project of Noa Hendricks, a 24-year-old producer who layers gauzy vocals over cavernous, slow-burning electronic textures. Influenced equally by Beach House and Burial.",
    photo: 'https://picsum.photos/seed/drift-theory/400/560',
    soundcloudUrl: 'https://soundcloud.com/forss/flickermood',
    trackName: 'Coastline',
    followers: 2780,
    tags: ['dream-pop', 'shoegaze', 'electronic'],
  },
  {
    id: 5,
    name: 'Ella Soto',
    genre: 'R&B / Soul',
    location: 'Atlanta, GA',
    bio: "Church harmonies met late-night R&B when Ella was 16. Her voice does things producers twice her age can't explain.",
    fullBio: "Ella Soto grew up singing in her grandmother's church in Decatur. The collision of gospel harmony and after-hours R&B is right there in every note she sings. At 22, she's released two EPs independently.",
    photo: 'https://picsum.photos/seed/ella-soto/400/560',
    soundcloudUrl: 'https://soundcloud.com/forss/flickermood',
    trackName: 'Still Here',
    followers: 4200,
    tags: ['r-b', 'soul', 'gospel'],
  },
  {
    id: 6,
    name: 'Phantom Pines',
    genre: 'Lo-Fi',
    location: 'Portland, OR',
    bio: "Beats that sound like they were recorded through a sweater. Lo-fi hip hop for people tired of lo-fi hip hop.",
    fullBio: "Phantom Pines is producer Theo Marsh's alias. His self-described 'sad-boy boom-bap' blends dusty samples, muffled drums, and occasional spoken word into something too restless to be background music.",
    photo: 'https://picsum.photos/seed/phantom-pines/400/560',
    soundcloudUrl: 'https://soundcloud.com/forss/flickermood',
    trackName: 'Cedar & Fog',
    followers: 1900,
    tags: ['lo-fi', 'hip-hop', 'instrumental'],
  },
]

// ── SoundCloud API integration ─────────────────────────────────────────
async function getSoundCloudToken(clientId, clientSecret) {
  const res = await fetch('https://secure.soundcloud.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!res.ok) throw new Error('Failed to get SoundCloud token')
  const data = await res.json()
  return data.access_token
}

const LABEL_KEYWORDS = ['records', 'music group', 'entertainment', 'label', 'columbia', 'universal', 'warner', 'sony', 'atlantic', 'republic', 'capitol', 'interscope', 'def jam', 'rca']

function isLikelyLabel(artist) {
  const desc = (artist.description || '').toLowerCase()
  return LABEL_KEYWORDS.some((kw) => desc.includes(kw))
}

async function fetchFromSoundCloud(genres, limit, maxFollowers, clientId, clientSecret) {
  const token = await getSoundCloudToken(clientId, clientSecret)
  const results = []

  for (const genre of genres) {
    const query = genre.replace(/-/g, ' ')
    const url = `https://api.soundcloud.com/users?q=${encodeURIComponent(query)}&limit=50&linked_partitioning=true`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) continue
    const data = await res.json()
    const users = data.collection || []

    for (const user of users) {
      // Filter: follower threshold
      if (user.followers_count >= maxFollowers) continue
      // Filter: must have avatar and description
      if (!user.avatar_url || !user.description) continue
      // Filter: no verified label indicators
      if (isLikelyLabel(user)) continue
      // Filter: must have at least one track
      if (!user.track_count || user.track_count === 0) continue

      // Fetch a representative track
      const trackRes = await fetch(`https://api.soundcloud.com/users/${user.id}/tracks?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!trackRes.ok) continue
      const tracks = await trackRes.json()
      const track = (tracks.collection || tracks)[0]
      if (!track) continue

      // Skip covers/remixes as primary track
      const titleLower = (track.title || '').toLowerCase()
      if (titleLower.includes('cover') || titleLower.includes('remix')) continue

      results.push({
        id: user.id,
        name: user.username,
        genre: genre.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        location: user.city ? `${user.city}${user.country_code ? ', ' + user.country_code : ''}` : user.country_code || 'Unknown',
        bio: (user.description || '').slice(0, 120) + ((user.description || '').length > 120 ? '…' : ''),
        fullBio: user.description || '',
        photo: user.avatar_url.replace('-large', '-t500x500'),
        soundcloudUrl: track.permalink_url,
        trackName: track.title,
        followers: user.followers_count,
        tags: [genre],
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
  const maxFollowers = parseInt(process.env.SOUNDCLOUD_MAX_FOLLOWERS || '5000', 10)

  const clientId = process.env.SOUNDCLOUD_CLIENT_ID
  const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET

  // Use real SoundCloud API if credentials are present
  if (clientId && clientSecret && clientId !== 'your_client_id_here') {
    try {
      const artists = await fetchFromSoundCloud(genres, limitNum, maxFollowers, clientId, clientSecret)
      return res.status(200).json({ artists, source: 'soundcloud' })
    } catch (err) {
      console.error('SoundCloud API error:', err.message)
      // Fall through to mock data
    }
  }

  // Return mock data (filtered by genre if possible)
  const filtered = genres.length
    ? MOCK_ARTISTS.filter((a) => a.tags?.some((t) => genres.includes(t)))
    : MOCK_ARTISTS

  const artists = filtered.length ? filtered : MOCK_ARTISTS

  return res.status(200).json({
    artists: artists.slice(0, limitNum),
    source: 'mock',
    note: 'Add SOUNDCLOUD_CLIENT_ID and SOUNDCLOUD_CLIENT_SECRET env vars to enable real artist data.',
  })
}
