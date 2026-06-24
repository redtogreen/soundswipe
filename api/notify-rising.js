// Scheduled endpoint — emails the top-N Rising artists when they trend.
// Triggered by Vercel Cron (configure in vercel.json).
//
// SETUP REQUIRED (Justin):
//   1. Sign up at https://resend.com (free: 100 emails/day, 3000/month)
//   2. Verify a sending domain (e.g. mail.soundswipe.fm)
//   3. Add env vars to Vercel:
//        RESEND_API_KEY=re_xxxx
//        RESEND_FROM=hello@mail.soundswipe.fm
//        NOTIFY_RISING_TOKEN=<random secret to gate manual calls>
//   4. Configure Vercel Cron (vercel.json):
//        {
//          "crons": [{ "path": "/api/notify-rising", "schedule": "0 16 * * 1" }]
//        }
//      (Monday 16:00 UTC = Monday morning US-time digest)
//   5. Provide artist email lookup. Three paths:
//        a) Manual: add ARTIST_EMAIL_MAP env var as JSON {"bailey-zimmerman":"mgmt@..."}
//        b) Build a contacts/ table in Upstash keyed by slug
//        c) Use a service like RocketReach API for contact enrichment (paid)
//      Until configured, the endpoint logs the rising artists but doesn't send.

import { redis, isoWeekKey, isRedisConfigured } from './_redis.js'

const TOP_N = 5

function getEmailFor(slug) {
  // Look up the artist's email. For now, check an env-var-provided mapping.
  // Replace this with your preferred contact source.
  try {
    const map = JSON.parse(process.env.ARTIST_EMAIL_MAP || '{}')
    return map[slug] || null
  } catch { return null }
}

function buildEmailHtml({ artist, total, breakdown, rank, weekLabel, publicUrl }) {
  return `
<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 40px auto; padding: 24px; color: #1A1518; line-height: 1.55;">
  <p style="font-size: 11px; font-weight: 600; letter-spacing: 1.6px; text-transform: uppercase; color: #8A6168; margin: 0 0 8px;">SOUNDSWIPE</p>
  <h1 style="font-size: 32px; font-weight: 700; letter-spacing: -0.8px; line-height: 1.05; margin: 0 0 12px;">
    You're trending on SoundSwipe this week.
  </h1>
  <p style="font-size: 16px; margin: 0 0 16px;">
    Hi ${artist.name},
  </p>
  <p style="font-size: 16px; margin: 0 0 16px;">
    Your name is at <strong>#${rank}</strong> on Rising on SoundSwipe for the week of ${weekLabel}.
    A community of listeners discovered you, saved you, and amplified you across their music services.
  </p>
  <div style="background: linear-gradient(155deg, #F7C0CE, #F2D78D); padding: 20px; margin: 20px 0; color: #1A1518;">
    <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.6px; text-transform: uppercase; margin-bottom: 6px;">This week</div>
    <div style="font-size: 36px; font-weight: 700; letter-spacing: -1px; line-height: 1;">${total} amplifications</div>
    <div style="font-size: 13px; margin-top: 8px; opacity: 0.85;">
      ${breakdown.spotify_follow || 0} new Spotify followers ·
      ${breakdown.apple_music_open || 0} opens on Apple Music ·
      ${breakdown.share || 0} shares
    </div>
  </div>
  <p style="font-size: 16px; margin: 0 0 16px;">
    SoundSwipe is a discovery app for music that deserves its audience.
    Your fans want more of you. <a href="${publicUrl}" style="color: #1A1518; font-weight: 600;">See your page →</a>
  </p>
  <p style="font-size: 14px; color: #5A5248; margin: 32px 0 0;">
    Reply to this email if you'd like to claim your artist page or just say hello.
  </p>
  <p style="font-size: 11px; color: #8A6168; margin-top: 24px;">
    SoundSwipe · The music the algorithms missed
  </p>
</body></html>`
}

function weekLabel(weekKey) {
  const m = weekKey.match(/^(\d{4})-W(\d{2})$/)
  if (!m) return weekKey
  const [, y, w] = m
  const jan4 = new Date(Date.UTC(+y, 0, 4))
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (+w - 1) * 7)
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || 'hello@soundswipe.fm'
  if (!apiKey) throw new Error('RESEND_API_KEY not set')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend ${res.status}: ${text}`)
  }
  return res.json()
}

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

export default async function handler(req, res) {
  // Cron security — Vercel sets a header on cron-invoked requests OR we use a token
  const cronHeader = req.headers['x-vercel-cron']
  const tokenParam = req.query?.token
  const expected = process.env.NOTIFY_RISING_TOKEN
  if (!cronHeader && (!expected || tokenParam !== expected)) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  if (!isRedisConfigured()) {
    return res.status(200).json({ ok: false, reason: 'storage_not_configured' })
  }

  try {
    const week = isoWeekKey()
    const top = await redis(['ZRANGE', `wk:${week}:total`, 0, TOP_N - 1, 'REV', 'WITHSCORES'])
    if (!top || top.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, reason: 'no_rising_artists' })
    }

    const artists = []
    for (let i = 0; i < top.length; i += 2) {
      const slug = top[i]
      const total = Number(top[i + 1])
      const rank = (i / 2) + 1
      const meta = hashToObj(await redis(['HGETALL', `artist:${slug}`]))
      const breakdown = hashToObj(await redis(['HGETALL', `wk:${week}:art:${slug}`]))
      artists.push({ slug, rank, total, name: meta.name || slug, breakdown })
    }

    const sent = []
    const skipped = []
    for (const a of artists) {
      const email = getEmailFor(a.slug)
      if (!email) {
        skipped.push({ ...a, reason: 'no_email' })
        continue
      }
      try {
        await sendEmail({
          to: email,
          subject: `You're #${a.rank} on SoundSwipe this week`,
          html: buildEmailHtml({
            artist: a,
            total: a.total,
            breakdown: {
              spotify_follow: Number(a.breakdown.spotify_follow || 0),
              apple_music_open: Number(a.breakdown.apple_music_open || 0),
              share: Number(a.breakdown.share || 0),
            },
            rank: a.rank,
            weekLabel: weekLabel(week),
            publicUrl: `https://soundswipe-pink.vercel.app/?artist=${a.slug}`,
          }),
        })
        sent.push(a)
      } catch (err) {
        skipped.push({ ...a, reason: err.message })
      }
    }

    return res.status(200).json({ ok: true, week, sent: sent.length, skipped: skipped.length, details: { sent, skipped } })
  } catch (err) {
    return res.status(500).json({ error: 'rising_notify_failed', detail: err.message })
  }
}
