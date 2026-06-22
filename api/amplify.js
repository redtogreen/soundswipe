// POST /api/amplify
// Records a single amplification event so the global leaderboard reflects it.
//
// Body: {
//   artist: { name: string, photo?: string, spotifyUrl?: string },
//   action: 'spotify_follow' | 'apple_music_open' | 'share'
// }

import { redisPipeline, isoWeekKey, slugify, isRedisConfigured } from './_redis.js'

const VALID_ACTIONS = new Set(['spotify_follow', 'apple_music_open', 'share'])

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  if (!isRedisConfigured()) {
    // Soft fail — the app still works, just no global leaderboard yet.
    return res.status(200).json({ ok: false, reason: 'storage_not_configured' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  body = body || {}

  const artist = body.artist || {}
  const action = body.action
  const name = String(artist.name || '').trim()
  if (!name) return res.status(400).json({ error: 'missing_artist_name' })
  if (!VALID_ACTIONS.has(action)) return res.status(400).json({ error: 'invalid_action' })

  const slug = slugify(name)
  if (!slug) return res.status(400).json({ error: 'invalid_slug' })

  const week = isoWeekKey()
  const totalKey = `wk:${week}:total`
  const breakdownKey = `wk:${week}:art:${slug}`
  const artistKey = `artist:${slug}`

  try {
    // One round-trip:
    //   1. ZINCRBY total leaderboard
    //   2. HINCRBY action breakdown for this week
    //   3. HSET / overwrite artist metadata (name, photo, spotifyUrl)
    //   4. EXPIRE week keys after ~60 days (housekeeping)
    const metaFields = ['name', name]
    if (artist.photo)      { metaFields.push('photo', String(artist.photo)) }
    if (artist.spotifyUrl) { metaFields.push('spotifyUrl', String(artist.spotifyUrl)) }
    metaFields.push('lastSeen', String(Date.now()))

    const pipeline = [
      ['ZINCRBY', totalKey, 1, slug],
      ['HINCRBY', breakdownKey, action, 1],
      ['HSET', artistKey, ...metaFields],
      ['EXPIRE', totalKey, 60 * 24 * 3600],
      ['EXPIRE', breakdownKey, 60 * 24 * 3600],
    ]
    const results = await redisPipeline(pipeline)
    const totalAfter = Number(results?.[0]?.result || 0)

    return res.status(200).json({ ok: true, week, total: totalAfter })
  } catch (err) {
    return res.status(500).json({ error: 'storage_error', detail: err.message })
  }
}
