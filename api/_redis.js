// Shared Upstash Redis REST helper.
// Vercel ignores files starting with `_` for routing, so this isn't an endpoint.

const URL_VAR = 'UPSTASH_REDIS_REST_URL'
const TOKEN_VAR = 'UPSTASH_REDIS_REST_TOKEN'

export function isRedisConfigured() {
  return Boolean(process.env[URL_VAR] && process.env[TOKEN_VAR])
}

async function callRedis(path, body) {
  const url = process.env[URL_VAR]
  const token = process.env[TOKEN_VAR]
  if (!url || !token) throw new Error('Upstash not configured')
  const res = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Upstash ${res.status}: ${text}`)
  }
  return res.json()
}

// Run a single command. E.g. redis(['ZRANGE', 'key', 0, 9, 'REV', 'WITHSCORES'])
export async function redis(command) {
  const { result } = await callRedis('', command)
  return result
}

// Run many commands in one round-trip. Returns an array of { result } / { error }.
// Each command is itself an array, e.g. [['INCR', 'k'], ['ZINCRBY', 'z', 1, 'm']]
export async function redisPipeline(commands) {
  const data = await callRedis('/pipeline', commands)
  return data
}

// ─── Helpers ──────────────────────────────────────────────────────────

// ISO-week key, e.g. "2026-W25". Monday-anchored.
export function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function previousIsoWeekKey(date = new Date()) {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() - 7)
  return isoWeekKey(d)
}

// Slugify an artist name to a stable key.
export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^\w\s-]/g, '')        // drop special chars
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
