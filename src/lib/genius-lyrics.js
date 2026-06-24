// Genius — lyric similarity layer.
// Cross-reference lyrical themes between artists to find matches that
// share story / subject matter, not just sound.
//
// SETUP REQUIRED (Justin):
//   1. Sign up at https://genius.com/api-clients
//   2. Create an API client, copy the Client Access Token
//   3. Add to Vercel env vars (Sensitive):
//        GENIUS_ACCESS_TOKEN=<your token>
//
// NOTE: Genius API returns metadata + page URLs, NOT lyric text directly
// (lyrics are protected by license). To get lyric text you'd scrape the
// page HTML OR use a downstream service. For similarity scoring, we use
// title/album metadata + Genius's "song stats" + tag matching.
//
// For TRUE lyric similarity (vector embeddings on actual text), pipeline:
//   1. Genius gives us song page URLs
//   2. Scrape the page for lyrics (with care for ToS)
//   3. Embed via OpenAI text-embedding-3-small ($0.02 / 1M tokens)
//   4. Cosine similarity vs other artists' lyric vectors
// That's a separate effort — this lib gets you started.

const GENIUS_API = 'https://api.genius.com'

export function isGeniusConfigured() {
  return Boolean(process.env.GENIUS_ACCESS_TOKEN)
}

async function geniusFetch(path) {
  if (!isGeniusConfigured()) throw new Error('Genius not configured')
  const res = await fetch(`${GENIUS_API}${path}`, {
    headers: { Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Genius ${res.status}`)
  return res.json()
}

/** Find an artist on Genius by name. Returns { id, name, url, image } or null. */
export async function findGeniusArtist(artistName) {
  if (!isGeniusConfigured()) return null
  try {
    const data = await geniusFetch(`/search?q=${encodeURIComponent(artistName)}`)
    const hit = data?.response?.hits?.find(
      (h) => h.result?.primary_artist?.name?.toLowerCase() === artistName.toLowerCase()
    )
    const artist = hit?.result?.primary_artist
    if (!artist) return null
    return {
      id: artist.id,
      name: artist.name,
      url: artist.url,
      image: artist.image_url,
    }
  } catch { return null }
}

/** Get top songs for an artist on Genius (sorted by popularity). */
export async function getArtistTopSongs(geniusArtistId, limit = 10) {
  if (!isGeniusConfigured()) return []
  try {
    const data = await geniusFetch(
      `/artists/${geniusArtistId}/songs?sort=popularity&per_page=${limit}`
    )
    return (data?.response?.songs || []).map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      releaseDate: s.release_date_for_display,
      pageviews: s.stats?.pageviews ?? 0,
    }))
  } catch { return [] }
}

/**
 * Lightweight lyrical-theme similarity — compares title-token overlap
 * across two artists' top songs. NOT real semantic similarity but a useful
 * proxy until embedding pipeline is built.
 *
 * Returns { sharedTokens, score (0-1) }.
 */
export async function compareLyricalThemes(artistAName, artistBName) {
  const [a, b] = await Promise.all([
    findGeniusArtist(artistAName),
    findGeniusArtist(artistBName),
  ])
  if (!a || !b) return { sharedTokens: [], score: 0 }
  const [aSongs, bSongs] = await Promise.all([
    getArtistTopSongs(a.id, 20),
    getArtistTopSongs(b.id, 20),
  ])
  const tokenize = (s) =>
    s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 3)
  const aTokens = new Set(aSongs.flatMap((s) => tokenize(s.title)))
  const bTokens = new Set(bSongs.flatMap((s) => tokenize(s.title)))
  const shared = [...aTokens].filter((t) => bTokens.has(t))
  const union = new Set([...aTokens, ...bTokens])
  return {
    sharedTokens: shared,
    score: union.size ? shared.length / union.size : 0,
  }
}
