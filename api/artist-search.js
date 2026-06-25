// GET /api/artist-search?q=phoebe
// Autocomplete for artist names. Hits Last.fm artist.search + filters out
// obscure/fake entries. Returns up to 6 results with photos.

function pickImage(images) {
  if (!images || !Array.isArray(images)) return null
  for (const size of ['extralarge', 'large', 'medium']) {
    const found = images.find((i) => i.size === size && i['#text'])
    if (found) return found['#text']
  }
  return null
}

async function itunesArtistImage(artistName) {
  // Last.fm search responses often have empty image fields. iTunes Search
  // reliably returns artwork — we use the artwork from the artist's top
  // track as a stand-in. Single roundtrip per result; cached at the edge.
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&limit=1&country=us`
    const r = await fetch(url)
    if (!r.ok) return null
    const data = await r.json()
    const art = data.results?.[0]?.artworkUrl100
    return art ? art.replace('100x100', '300x300') : null
  } catch { return null }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

  const q = String(req.query?.q || '').trim()
  if (q.length < 2) return res.status(200).json({ results: [] })

  const apiKey = process.env.LASTFM_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'lastfm_not_configured' })

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(q)}&api_key=${apiKey}&format=json&limit=8`
    const r = await fetch(url)
    if (!r.ok) return res.status(502).json({ error: 'lastfm_failed' })
    const data = await r.json()

    const raw = (data.results?.artistmatches?.artist || [])
      .filter((a) => parseInt(a.listeners || '0', 10) >= 1000)
      .slice(0, 6)

    // Enrich each result with an iTunes artwork URL when Last.fm's image
    // is missing or a placeholder. Parallelize for speed.
    const enriched = await Promise.all(
      raw.map(async (a) => {
        let image = pickImage(a.image)
        if (!image || image.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          // Last.fm placeholder (the broken default) — use iTunes instead
          image = await itunesArtistImage(a.name)
        }
        return {
          name: a.name,
          image,
          listeners: parseInt(a.listeners || '0', 10),
          mbid: a.mbid || null,
        }
      })
    )

    return res.status(200).json({ results: enriched })
  } catch (err) {
    return res.status(500).json({ error: 'search_failed', detail: err.message })
  }
}
