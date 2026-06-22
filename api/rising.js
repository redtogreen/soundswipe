// GET /api/rising?limit=20
// Returns this week's leaderboard with per-action breakdowns and
// last-week rank deltas (NEW, ↑/↓ from #X).

import { redis, redisPipeline, isoWeekKey, previousIsoWeekKey, isRedisConfigured } from './_redis.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  if (!isRedisConfigured()) {
    // The page can render an empty state without crashing.
    return res.status(200).json({
      ok: false,
      reason: 'storage_not_configured',
      week: isoWeekKey(),
      artists: [],
    })
  }

  const limit = Math.min(Math.max(parseInt(req.query?.limit) || 20, 1), 50)
  const week = isoWeekKey()
  const lastWeek = previousIsoWeekKey()

  try {
    // Top N for this week
    const topRaw = await redis(['ZRANGE', `wk:${week}:total`, 0, limit - 1, 'REV', 'WITHSCORES'])
    if (!topRaw || topRaw.length === 0) {
      return res.status(200).json({ ok: true, week, artists: [] })
    }

    // topRaw is [slug, score, slug, score, ...] — pair them
    const ranked = []
    for (let i = 0; i < topRaw.length; i += 2) {
      ranked.push({ slug: topRaw[i], total: Number(topRaw[i + 1]) })
    }

    // Fetch artist metadata + per-action breakdown + last-week rank in parallel
    const commands = []
    for (const r of ranked) {
      commands.push(['HGETALL', `artist:${r.slug}`])
      commands.push(['HGETALL', `wk:${week}:art:${r.slug}`])
      commands.push(['ZREVRANK', `wk:${lastWeek}:total`, r.slug])
    }
    const results = await redisPipeline(commands)

    const artists = ranked.map((r, i) => {
      const meta = hashToObj(results[i * 3]?.result)
      const breakdown = hashToObj(results[i * 3 + 1]?.result)
      const lastWeekRank = results[i * 3 + 2]?.result
      return {
        rank: i + 1,
        slug: r.slug,
        name: meta.name || r.slug,
        photo: meta.photo || null,
        spotifyUrl: meta.spotifyUrl || null,
        total: r.total,
        breakdown: {
          spotify_follow: Number(breakdown.spotify_follow || 0),
          apple_music_open: Number(breakdown.apple_music_open || 0),
          share: Number(breakdown.share || 0),
        },
        lastWeekRank: lastWeekRank == null ? null : Number(lastWeekRank) + 1,
        movement:
          lastWeekRank == null ? 'new' :
          Number(lastWeekRank) + 1 > i + 1 ? 'up' :
          Number(lastWeekRank) + 1 < i + 1 ? 'down' :
          'same',
      }
    })

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300')
    return res.status(200).json({ ok: true, week, artists })
  } catch (err) {
    return res.status(500).json({ error: 'storage_error', detail: err.message })
  }
}

// Upstash REST returns hashes as either:
//   - { field1: 'val', field2: 'val' } (object), or
//   - [field1, val, field2, val] (array of pairs)
// depending on version. Handle both.
function hashToObj(input) {
  if (!input) return {}
  if (Array.isArray(input)) {
    const obj = {}
    for (let i = 0; i < input.length; i += 2) obj[input[i]] = input[i + 1]
    return obj
  }
  if (typeof input === 'object') return input
  return {}
}
