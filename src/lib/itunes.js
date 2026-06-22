// Fetch multiple tracks for an artist from Apple iTunes Search.
// Free, no auth, no quota. Returns up to `limit` tracks with previewUrl.
//
// We over-fetch then filter to exact artist name matches first to avoid
// "artists who feature on a track" pollution.

export async function getArtistTracks(artistName, limit = 6) {
  if (!artistName) return []
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&limit=${limit * 3}&country=us`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    const results = data.results || []

    const lower = artistName.toLowerCase()
    const exact = results.filter(
      (t) => (t.artistName || '').toLowerCase() === lower && t.previewUrl
    )
    const fuzzy = results.filter(
      (t) =>
        (t.artistName || '').toLowerCase().includes(lower) &&
        t.previewUrl &&
        !exact.includes(t)
    )

    const merged = [...exact, ...fuzzy]

    // Dedupe by trackName (case-insensitive)
    const seen = new Set()
    const deduped = []
    for (const t of merged) {
      const key = (t.trackName || '').toLowerCase().trim()
      if (!key || seen.has(key)) continue
      seen.add(key)
      deduped.push(t)
      if (deduped.length >= limit) break
    }

    return deduped.map((t) => ({
      id: String(t.trackId),
      trackName: t.trackName,
      previewUrl: t.previewUrl,
      duration: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : null,
      artwork: t.artworkUrl100 ? t.artworkUrl100.replace('100x100', '600x600') : null,
      albumName: t.collectionName || null,
      releaseYear: t.releaseDate ? new Date(t.releaseDate).getFullYear() : null,
    }))
  } catch {
    return []
  }
}

export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return ''
  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}
