// GET /api/artist?slug=bailey-zimmerman
// Resolves a slug to a single artist's data (Last.fm getInfo + iTunes preview).
// Powers public artist pages and shareable deep links: /?artist=bailey-zimmerman

const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/'

function slugToName(slug) {
  // bailey-zimmerman → Bailey Zimmerman
  return String(slug || '')
    .replace(/-/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function nameToSlug(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function lastfmGetInfo(name, apiKey) {
  const url = `${LASTFM_BASE}?method=artist.getinfo&artist=${encodeURIComponent(name)}&api_key=${apiKey}&format=json`
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const data = await r.json()
    return data.artist || null
  } catch { return null }
}

async function itunesFindPreview(artistName) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&limit=5&country=us`
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const data = await r.json()
    const results = data.results || []
    const exact = results.find(
      (t) => (t.artistName || '').toLowerCase() === artistName.toLowerCase() && t.previewUrl
    )
    const picked = exact || results.find((t) => t.previewUrl)
    if (!picked) return null
    return {
      previewUrl: picked.previewUrl,
      trackName: picked.trackName,
      artwork: picked.artworkUrl100 ? picked.artworkUrl100.replace('100x100', '600x600') : null,
    }
  } catch { return null }
}

function pickImage(images) {
  if (!images) return null
  if (Array.isArray(images)) {
    for (const size of ['mega', 'extralarge', 'large', 'medium']) {
      const found = images.find((i) => i.size === size && i['#text'])
      if (found) return found['#text']
    }
  }
  return null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const { slug = '', name = '' } = req.query
  const artistName = name || slugToName(slug)
  if (!artistName) {
    return res.status(400).json({ error: 'missing_artist' })
  }

  const apiKey = process.env.LASTFM_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'lastfm_not_configured' })
  }

  try {
    const [info, itunes] = await Promise.all([
      lastfmGetInfo(artistName, apiKey),
      itunesFindPreview(artistName),
    ])

    if (!info) {
      return res.status(404).json({ error: 'artist_not_found', name: artistName })
    }

    const listeners = parseInt(info.stats?.listeners || '0', 10)
    const tags = (info.tags?.tag || []).map((t) => t.name).slice(0, 5)
    const bioSummary = (info.bio?.summary || '')
      .replace(/<a[^>]*>.*?<\/a>/g, '')
      .replace(/\s+Read more.*$/, '')
      .trim()

    const artist = {
      id: `lastfm-${nameToSlug(info.name)}`,
      slug: nameToSlug(info.name),
      name: info.name,
      genre: tags[0] ? tags[0].replace(/\b\w/g, (c) => c.toUpperCase()) : 'Discovery',
      location: null,
      bio: bioSummary.slice(0, 200),
      fullBio: bioSummary,
      photo: pickImage(info.image) || itunes?.artwork || null,
      previewUrl: itunes?.previewUrl || null,
      trackName: itunes?.trackName || null,
      spotifyUrl: null,
      spotifyTrackId: null,
      soundcloudUrl: null,
      followers: listeners,
      popularity: parseInt(info.stats?.playcount || '0', 10),
      tags,
      _match: null,        // not applicable for direct lookups
      _seed: null,
      _publicLookup: true, // signals to client this came from a deep link
    }

    return res.status(200).json({ ok: true, artist })
  } catch (err) {
    return res.status(500).json({ error: 'fetch_failed', detail: err.message })
  }
}
