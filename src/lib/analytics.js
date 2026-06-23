// Analytics via PostHog.
//
// SETUP REQUIRED (Justin):
//   1. Sign up at https://posthog.com (free tier: 1M events/month)
//   2. Create a project. Copy the Project API Key (starts with `phc_`).
//   3. Add to Vercel env vars:
//        VITE_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxx
//        VITE_POSTHOG_HOST=https://us.i.posthog.com  (or https://eu.i.posthog.com)
//   4. Redeploy.
//
// Until configured, every track() call is a no-op — code stays valid, just
// nothing is sent.
//
// We use the lightweight CDN snippet rather than the npm package so the JS
// bundle stays small. Loaded once on app start.

const SCRIPT_SRC_TEMPLATE = (host) =>
  `${host || 'https://us.i.posthog.com'}/static/array.js`

let loadPromise = null
let initialized = false

export function isAnalyticsConfigured() {
  return Boolean(import.meta.env.VITE_POSTHOG_KEY)
}

export function initAnalytics() {
  if (initialized || !isAnalyticsConfigured() || typeof window === 'undefined') return
  initialized = true

  const key = import.meta.env.VITE_POSTHOG_KEY
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

  // Standard PostHog snippet — queues calls until the script loads.
  !function (t, e) {
    var o, n, p, r
    e.__SV || ((window.posthog = e),
      e._i = [], e.init = function (i, s, a) {
        function g(t, e) {
          var o = e.split('.'); 2 == o.length && (t = t[o[0]], e = o[1])
          t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) }
        }
        (p = t.createElement('script')).type = 'text/javascript', p.async = !0,
          p.src = s.api_host + '/static/array.js',
          (r = t.getElementsByTagName('script')[0]).parentNode.insertBefore(p, r)
        var u = e
        for (void 0 !== a ? u = e[a] = [] : a = 'posthog', u.people = u.people || [],
          u.toString = function (t) { var e = 'posthog'; return 'posthog' !== a && (e += '.' + a), t || (e += ' (stub)'), e },
          u.people.toString = function () { return u.toString(1) + '.people (stub)' },
          o = 'capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId'.split(' '), n = 0; n < o.length; n++) g(u, o[n])
        e._i.push([i, s, a])
      }, e.__SV = 1)
  }(document, window.posthog || [])

  window.posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    persistence: 'localStorage',
  })
}

/** Track a named event with optional properties. No-op if not configured. */
export function track(event, properties = {}) {
  if (typeof window === 'undefined' || !window.posthog) return
  try {
    window.posthog.capture(event, properties)
  } catch { /* never break the app on analytics failure */ }
}

/** Identify the current user (call once after they connect Spotify, etc.). */
export function identify(userId, traits = {}) {
  if (typeof window === 'undefined' || !window.posthog) return
  try {
    window.posthog.identify(userId, traits)
  } catch {}
}

/** Reset on logout/disconnect — drops anonymous association. */
export function resetAnalytics() {
  if (typeof window === 'undefined' || !window.posthog) return
  try { window.posthog.reset() } catch {}
}

// ─── Event helpers — call these from app code instead of raw track() ───
// Keeps event names consistent and discoverable.
export const Events = {
  splash_start:            (props) => track('splash_start', props),
  top_artists_confirm:     (props) => track('top_artists_confirm', props),
  genre_confirm:           (props) => track('genre_confirm', props),
  swipe_save:              (props) => track('swipe_save', props),
  swipe_pass:              (props) => track('swipe_pass', props),
  swipe_undo:              (props) => track('swipe_undo', props),
  amplify_spotify_follow:  (props) => track('amplify_spotify_follow', props),
  amplify_apple_add:       (props) => track('amplify_apple_add', props),
  amplify_youtube_sub:     (props) => track('amplify_youtube_sub', props),
  amplify_share:           (props) => track('amplify_share', props),
  rising_view:             (props) => track('rising_view', props),
  manifesto_open:          (props) => track('manifesto_open', props),
  playlist_export:         (props) => track('playlist_export', props),
  spotify_connect:         (props) => track('spotify_connect', props),
  apple_connect:           (props) => track('apple_connect', props),
  youtube_connect:         (props) => track('youtube_connect', props),
}
