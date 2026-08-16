import { useState, useCallback, useRef, useEffect } from 'react'
import { MOCK_ARTISTS } from './data/mockArtists.js'
import SplashScreen from './screens/SplashScreen.jsx'
import ConnectOrPickScreen from './screens/ConnectOrPickScreen.jsx'
import TopArtistsScreen from './screens/TopArtistsScreen.jsx'
import GenreScreen from './screens/GenreScreen.jsx'
import SwipeScreen from './screens/SwipeScreen.jsx'
import ExpandScreen from './screens/ExpandScreen.jsx'
import SavedScreen from './screens/SavedScreen.jsx'
import RisingScreen from './screens/RisingScreen.jsx'
import LoadingScreen from './screens/LoadingScreen.jsx'
import ConnectServicesScreen from './screens/ConnectServicesScreen.jsx'
import ManualSeedScreen from './screens/ManualSeedScreen.jsx'
import Toast from './components/Toast.jsx'
import Manifesto from './components/Manifesto.jsx'
import AmplifySheet from './components/AmplifySheet.jsx'
import { IconSave } from './components/Icons.jsx'
import { beginAuth, handleRedirect, getStoredAuth, clearAuth } from './lib/spotify-auth.js'
import { createPlaylistFromFinds, syncPlaylist, getMyPlaylists, getPlaylistTracks, enrichWithSpotify, followSpotifyArtist, InsufficientScopeError } from './lib/spotify-api.js'
import { recordAmp, recordAmpLocal, postAmplify } from './lib/amplify-tracking.js'
import {
  isAppleMusicConfigured,
  authorizeAppleMusic,
  getStoredAppleAuth,
  clearAppleAuth,
  addAppleArtistToLibrary,
} from './lib/apple-music-auth.js'
import {
  isYouTubeConfigured,
  authorizeYouTube,
  getStoredYouTubeAuth,
  clearYouTubeAuth,
  isYouTubeAuthValid,
  subscribeToArtistChannel,
} from './lib/youtube-auth.js'
import { initAnalytics, Events as Analytics } from './lib/analytics.js'
import {
  isPlaybackSDKSupported,
  canUseStreamMode,
  initPlayer,
  playSpotifyUri,
  pauseSpotify,
  setSpotifyVolume,
  disconnectPlayer,
  isPlayerReady,
  isStreamModeOn,
  setStreamMode as persistStreamMode,
} from './lib/spotify-playback.js'

// Filter artists by selected genres. Falls back to all artists if no match.
function filterArtists(artists, selectedGenres) {
  if (!selectedGenres.length) return [...artists]
  const filtered = artists.filter((a) =>
    a.tags?.some((t) => selectedGenres.includes(t)) ||
    selectedGenres.some((g) => a.genre.toLowerCase().replace(/[\s/&]/g, '-').includes(g))
  )
  return filtered.length ? filtered : [...artists]
}

// Persist app state across page reloads (Spotify OAuth round-trip wipes
// in-memory React state, so we save the bits that matter).
const STATE_KEY = 'soundswipe_state_v1'
function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function persistState(state) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)) } catch {}
}

const DEFAULT_BOARD = { id: 'all-finds', name: 'All Finds' }
const persisted = loadPersistedState()

// Migration: if there are saved artists without a boardId (from before boards
// existed), assign them to the default board.
const migratedSavedArtists = (persisted?.savedArtists || []).map((a) =>
  a.boardId ? a : { ...a, boardId: DEFAULT_BOARD.id }
)
const initialBoards = persisted?.boards?.length
  ? persisted.boards
  : [DEFAULT_BOARD]

export default function App() {
  // splash | connect-or-pick | top-artists | genre | swipe | expand | saved | rising
  const [screen, setScreen] = useState(() => {
    // Public deep-link: /rising loads the leaderboard without going through onboarding
    if (typeof window !== 'undefined' && window.location.pathname === '/rising') {
      return 'rising'
    }
    return 'splash'
  })
  const [prevScreen, setPrevScreen] = useState(null)

  const [selectedGenres, setSelectedGenres] = useState(persisted?.selectedGenres || [])
  const [queue, setQueue] = useState(persisted?.queue || [])
  const [savedArtists, setSavedArtists] = useState(migratedSavedArtists)
  const [boards, setBoards] = useState(initialBoards)
  const [currentBoardId, setCurrentBoardId] = useState(DEFAULT_BOARD.id)
  const [expandArtist, setExpandArtist] = useState(null)
  const [expandFromQueue, setExpandFromQueue] = useState(false) // came from swipe screen?

  // Audio preview state — a SINGLE persistent <audio> element lives at the
  // App level so that once the user has started playback once, subsequent
  // cards can autoplay reliably (iOS Safari/Chrome treat each fresh element
  // as needing its own gesture, but a persistent one stays "unlocked").
  const audioRef = useRef(null)
  const [isMuted, setIsMuted] = useState(false)
  const [audioStarted, setAudioStarted] = useState(false)
  // Surface what's playing so Expand's track list can highlight the active row.
  const [currentAudioSrc, setCurrentAudioSrc] = useState(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)

  // Stream Mode — real Spotify playback (Premium + supported browser only).
  // Off by default. When on, we use Spotify Web Playback SDK instead of
  // iTunes previews so listens count as real streams.
  const [streamMode, setStreamMode] = useState(() => isStreamModeOn())
  const [streamModeReady, setStreamModeReady] = useState(false)
  // Used by SavedScreen to show/hide the toggle without redundant checks
  const streamModeAvailable = canUseStreamMode(spotifyAuth) && isPlaybackSDKSupported()

  // Update playback whenever the top swipe-card changes. In Stream Mode
  // (Premium + supported browser + toggle on), we route to the Spotify
  // Web Playback SDK so each listen counts as a real Spotify stream.
  // Otherwise we fall through to the iTunes preview MP3 in the <audio> tag.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const topCard = screen === 'swipe' ? queue[0] : null

    const streamActive = streamMode && streamModeReady && isPlayerReady()
    const spotifyUri = topCard?.spotifyTrackUri || null
    const previewUrl = topCard?.previewUrl || null

    if (streamActive && spotifyUri) {
      // Real Spotify playback — kill the preview <audio> element
      audio.pause()
      setCurrentAudioSrc(spotifyUri)
      playSpotifyUri(spotifyUri)
        .then(() => setAudioStarted(true))
        .catch((err) => {
          console.warn('[stream] fallback to preview', err?.message)
          // Fall back to preview if Spotify play fails (device gone, etc.)
          if (previewUrl) {
            audio.src = previewUrl
            setCurrentAudioSrc(previewUrl)
            audio.volume = isMuted ? 0 : 1
            audio.play().then(() => setAudioStarted(true)).catch(() => {})
          }
        })
    } else if (previewUrl) {
      // Preview mode — ensure Spotify SDK isn't playing
      pauseSpotify()
      if (audio.src !== previewUrl) {
        audio.src = previewUrl
        setCurrentAudioSrc(previewUrl)
      }
      audio.volume = isMuted ? 0 : 1
      audio.play()
        .then(() => setAudioStarted(true))
        .catch(() => { /* autoplay blocked — first tap will start it */ })
    } else if (screen !== 'expand') {
      audio.pause()
      pauseSpotify()
    }
    // We intentionally don't depend on isMuted here — separate effect handles it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, screen, streamMode, streamModeReady])

  // Listen for play/pause events to keep isAudioPlaying in sync.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay = () => setIsAudioPlaying(true)
    const onPause = () => setIsAudioPlaying(false)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [])

  // Programmatic play/pause from the Expand track list (and anywhere else).
  const playPreview = (url) => {
    if (!url) return
    const audio = audioRef.current
    if (!audio) return
    if (audio.src !== url) {
      audio.src = url
      setCurrentAudioSrc(url)
    }
    audio.volume = isMuted ? 0 : 1
    audio.play()
      .then(() => setAudioStarted(true))
      .catch(() => { /* still locked — user must tap audio button on swipe screen */ })
  }

  const pausePreview = () => {
    const audio = audioRef.current
    if (audio && !audio.paused) audio.pause()
  }

  // Apply mute changes to live audio element AND Spotify player
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : 1
    if (streamMode && streamModeReady) {
      setSpotifyVolume(isMuted ? 0 : 0.9)
    }
  }, [isMuted, streamMode, streamModeReady])

  // Pause audio whenever the page is hidden, backgrounded, or unloaded —
  // otherwise iOS will keep playing the looped track after the user closes
  // the tab or switches apps.
  useEffect(() => {
    const pause = () => {
      const audio = audioRef.current
      if (audio && !audio.paused) audio.pause()
    }
    const onVisibility = () => { if (document.hidden) pause() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', pause)
    window.addEventListener('beforeunload', pause)
    window.addEventListener('blur', pause)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', pause)
      window.removeEventListener('beforeunload', pause)
      window.removeEventListener('blur', pause)
    }
  }, [])

  // Called from the audio button — first tap starts playback (gesture
  // context), subsequent taps toggle mute.
  const handleAudioTap = () => {
    const audio = audioRef.current
    if (!audio) return
    if (!audioStarted) {
      audio.play()
        .then(() => setAudioStarted(true))
        .catch(() => { /* still blocked, e.g. silent switch on */ })
    } else {
      setIsMuted((m) => !m)
    }
  }

  // Manifesto modal
  const [showManifesto, setShowManifesto] = useState(false)

  // Spotify auth state (localStorage-backed; prototype)
  const [spotifyAuth, setSpotifyAuth] = useState(() => getStoredAuth())
  // Apple Music + YouTube auth state — gated on env vars being configured.
  const [appleAuth, setAppleAuth] = useState(() => getStoredAppleAuth())
  const [youtubeAuth, setYoutubeAuth] = useState(() => getStoredYouTubeAuth())

  // Initialize analytics once on mount. No-op if VITE_POSTHOG_KEY isn't set.
  useEffect(() => { initAnalytics() }, [])

  // Initialize Spotify Web Playback SDK when Stream Mode gets flipped on.
  // Tear it down when flipped off or disconnected from Spotify.
  useEffect(() => {
    if (!streamMode) {
      setStreamModeReady(false)
      return
    }
    if (!canUseStreamMode(spotifyAuth)) {
      setStreamModeReady(false)
      return
    }
    let cancelled = false
    initPlayer()
      .then(() => { if (!cancelled) setStreamModeReady(true) })
      .catch((err) => {
        if (cancelled) return
        setStreamModeReady(false)
        showToast(`Stream mode couldn’t start: ${err?.message || 'unknown error'}`)
        setStreamMode(false)
        persistStreamMode(false)
      })
    return () => { cancelled = true }
  }, [streamMode, spotifyAuth])

  // Toggle Stream Mode from the UI
  const handleToggleStreamMode = () => {
    if (!streamMode) {
      // Turning ON — pre-flight checks
      if (!spotifyAuth?.accessToken) {
        showToast('Connect Spotify to use Stream Mode')
        return
      }
      if (spotifyAuth?.profile?.product !== 'premium') {
        showToast('Stream Mode requires Spotify Premium')
        return
      }
      if (!isPlaybackSDKSupported()) {
        showToast('Stream Mode isn’t supported in this browser')
        return
      }
    } else {
      // Turning OFF — pause any active playback
      pauseSpotify()
    }
    const next = !streamMode
    setStreamMode(next)
    persistStreamMode(next)
  }

  // Persist core state to localStorage whenever it changes
  useEffect(() => {
    persistState({ savedArtists, selectedGenres, queue, boards })
  }, [savedArtists, selectedGenres, queue, boards])

  // Load SoundCloud Widget API once on mount (used as audio fallback)
  useEffect(() => {
    if (window.SC) return
    const script = document.createElement('script')
    script.src = 'https://w.soundcloud.com/player/api.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  // Handle Spotify OAuth callback on mount (if redirected back with ?code=)
  useEffect(() => {
    const url = new URL(window.location.href)
    const hasCode = url.searchParams.has('code') || url.searchParams.has('error')
    if (!hasCode) return
    handleRedirect().then((result) => {
      if (result?.ok) {
        setSpotifyAuth(result.auth)
        // Honor whatever screen the user was in when they kicked off the auth
        const next = result.returnTo || 'saved'
        setScreen(next)
        showToast(`Connected as ${result.auth.profile?.displayName || 'Spotify'}`)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle deep links: /?artist=bailey-zimmerman opens that artist's
  // expand page directly. The artist data is fetched fresh from Last.fm
  // via /api/artist?slug=...
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const slug = url.searchParams.get('artist')
    if (!slug) return
    // Don't intercept OAuth callbacks
    if (url.searchParams.has('code') || url.searchParams.has('error')) return

    fetch(`/api/artist?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.artist) {
          setExpandArtist(data.artist)
          setExpandFromQueue(false)
          setScreen('expand')
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConnectSpotify = (returnTo = 'saved') => {
    beginAuth(returnTo).catch((err) => {
      showToast(err.message || 'Could not start Spotify sign-in')
    })
  }

  const handleDisconnectSpotify = () => {
    clearAuth()
    setSpotifyAuth(null)
    // Tear down Stream Mode too — no Spotify, no real streams
    if (streamMode) {
      setStreamMode(false)
      persistStreamMode(false)
      disconnectPlayer()
      setStreamModeReady(false)
    }
    showToast('Disconnected from Spotify')
  }

  // Export / sync the current board to Spotify
  const [isExporting, setIsExporting] = useState(false)
  const handleExportPlaylist = async () => {
    const board = boards.find((b) => b.id === currentBoardId)
    if (!board) return
    const boardArtists = savedArtists.filter((a) => a.boardId === board.id)
    if (boardArtists.length === 0 || isExporting) return

    setIsExporting(true)
    try {
      let result
      let openUrl
      if (board.spotifyPlaylistId) {
        // Update an existing Spotify playlist (imported board or previously synced)
        result = await syncPlaylist(board.spotifyPlaylistId, boardArtists)
        openUrl = `https://open.spotify.com/playlist/${board.spotifyPlaylistId}`
      } else {
        // First-time sync: create a new playlist named after the board
        result = await createPlaylistFromFinds(boardArtists, { name: board.name })
        openUrl = result.playlist?.external_urls?.spotify
        // Remember the playlist ID on this board so future syncs update it
        const newId = result.playlist?.id
        if (newId) {
          setBoards((prev) =>
            prev.map((b) => (b.id === board.id ? { ...b, spotifyPlaylistId: newId } : b))
          )
        }
      }

      const tail = result.missed.length ? ` · ${result.missed.length} skipped` : ''
      const verb = board.spotifyPlaylistId ? 'updated' : 'created'
      if (toastTimer.current) clearTimeout(toastTimer.current)
      setToast({
        message: `Playlist ${verb} · ${result.addedCount} ${result.addedCount === 1 ? 'track' : 'tracks'}${tail}`,
        visible: true,
        actionLabel: openUrl ? 'Open ↗' : null,
        onAction: openUrl ? () => window.open(openUrl, '_blank', 'noopener,noreferrer') : null,
      })
      toastTimer.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }))
      }, 6000)
    } catch (err) {
      if (err instanceof InsufficientScopeError) {
        showToast('Permission needed — disconnect and reconnect Spotify')
      } else {
        showToast(err.message || 'Could not sync playlist')
      }
    } finally {
      setIsExporting(false)
    }
  }

  // Import an existing Spotify playlist as a new board
  const [importablePlaylists, setImportablePlaylists] = useState(null) // null = closed, [] = loading
  const [isImporting, setIsImporting] = useState(false)
  const handleOpenImport = async () => {
    setImportablePlaylists([])  // open + loading
    try {
      const list = await getMyPlaylists(50)
      setImportablePlaylists(list)
    } catch (err) {
      setImportablePlaylists(null)
      if (err instanceof InsufficientScopeError) {
        showToast('Permission needed — disconnect and reconnect Spotify')
      } else {
        showToast(err.message || 'Could not load your Spotify playlists')
      }
    }
  }
  const handleCloseImport = () => setImportablePlaylists(null)
  const handleImportPlaylist = async (playlist) => {
    if (isImporting) return
    setIsImporting(true)
    try {
      const importedArtists = await getPlaylistTracks(playlist.id, 100)
      if (importedArtists.length === 0) {
        showToast('That playlist has no usable tracks')
        return
      }
      const newBoardId = `board-${Date.now().toString(36)}`
      const newBoard = {
        id: newBoardId,
        name: playlist.name,
        spotifyPlaylistId: playlist.id,
        importedFromSpotify: true,
      }
      setBoards((prev) => [...prev, newBoard])
      setSavedArtists((prev) => {
        const existingIds = new Set(prev.map((a) => a.id))
        const tagged = importedArtists
          .filter((a) => !existingIds.has(a.id))
          .map((a) => ({ ...a, boardId: newBoardId }))
        return [...prev, ...tagged]
      })
      setCurrentBoardId(newBoardId)
      setImportablePlaylists(null)
      showToast(`Imported · ${importedArtists.length} ${importedArtists.length === 1 ? 'artist' : 'artists'}`)
    } catch (err) {
      if (err instanceof InsufficientScopeError) {
        showToast('Permission needed — disconnect and reconnect Spotify')
      } else {
        showToast(err.message || 'Could not import that playlist')
      }
    } finally {
      setIsImporting(false)
    }
  }

  // Wipe all prototype state — finds, genres, queue, boards, Spotify auth.
  const handleReset = () => {
    try { localStorage.removeItem(STATE_KEY) } catch {}
    clearAuth()
    setSavedArtists([])
    setSelectedGenres([])
    setQueue([])
    setBoards([DEFAULT_BOARD])
    setCurrentBoardId(DEFAULT_BOARD.id)
    setSpotifyAuth(null)
    setExpandArtist(null)
    setScreen('splash')
    showToast('Prototype reset')
  }

  // Toast
  const [toast, setToast] = useState({
    message: '', visible: false, actionLabel: null, onAction: null,
    status: null, secondaryActionLabel: null, onSecondaryAction: null,
  })
  const toastTimer = useRef(null)

  const showToast = (message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({
      message, visible: true, actionLabel: null, onAction: null,
      status: null, secondaryActionLabel: null, onSecondaryAction: null,
    })
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 2200)
  }

  const showUndoToast = (message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({
      message,
      visible: true,
      status: null,
      secondaryActionLabel: null,
      onSecondaryAction: null,
      actionLabel: '↶ Undo',
      onAction: () => {
        if (toastTimer.current) clearTimeout(toastTimer.current)
        setToast((prev) => ({ ...prev, visible: false }))
        handleUndo()
      },
    })
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 4500)
  }

  // Rich "you just saved an artist" toast with auto-follow status + Share + Undo.
  const showSaveToast = (artist, status) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({
      message: `Saved ${artist.name}`,
      status,
      visible: true,
      actionLabel: '↶ Undo',
      onAction: () => {
        if (toastTimer.current) clearTimeout(toastTimer.current)
        setToast((prev) => ({ ...prev, visible: false }))
        handleUndo()
      },
      secondaryActionLabel: 'Share',
      onSecondaryAction: () => shareArtist(artist),
    })
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 6000)
  }

  // Slug helper for deep-link share URLs
  const artistSlug = (name) =>
    String(name || '')
      .toLowerCase()
      .trim()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

  // Native-share fallback to clipboard. Either way, records the amplification.
  // URL is a deep link to the artist's page: /?artist=bailey-zimmerman
  const shareArtist = async (artist) => {
    const slug = artistSlug(artist.name)
    const url = `${window.location.origin}/?artist=${slug}`
    const text = `Just discovered ${artist.name} on SoundSwipe. Check them out → ${url}`
    let shared = false
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: artist.name, text, url })
        shared = true
      } catch {
        // user cancelled — don't record
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url)
        shared = true
        showToast('Link copied')
      } catch {}
    }
    if (shared) {
      recordAmp(artist, 'share')
      Analytics.amplify_share({ artist: artist.name })
    }
  }

  // Track the last swipe so it can be undone
  const [lastSwipe, setLastSwipe] = useState(null) // { artist, action }
  const handleUndo = () => {
    setLastSwipe((current) => {
      if (!current) return null
      const { artist, action } = current
      if (action === 'save') {
        setSavedArtists((prev) => prev.filter((a) => a.id !== artist.id))
      }
      setQueue((prev) => [artist, ...prev])
      return null
    })
  }

  // Save-burst overlay (heart flash) — key remounts to retrigger animation
  const [saveBurst, setSaveBurst] = useState(null)
  const burstTimer = useRef(null)
  const triggerSaveBurst = () => {
    if (burstTimer.current) clearTimeout(burstTimer.current)
    setSaveBurst({ id: Date.now() })
    burstTimer.current = setTimeout(() => setSaveBurst(null), 800)
  }

  // Amplify sheet (the Forbes-worthy mechanic — every save can grow an artist)
  const [amplifyArtist, setAmplifyArtist] = useState(null)

  // ── Navigation helpers ─────────────────────────────────────────────
  const navigate = (to) => {
    setPrevScreen(screen)
    setScreen(to)
    // Keep URL in sync for the public Rising page so it can be linked/shared.
    if (typeof window !== 'undefined') {
      const targetPath = to === 'rising' ? '/rising' : '/'
      if (window.location.pathname !== targetPath) {
        window.history.replaceState({}, '', targetPath)
      }
    }
  }

  // ── Splash → Connect Services (new platform-choice onboarding) ──
  const handleSplashStart = () => {
    Analytics.splash_start({ has_spotify: Boolean(spotifyAuth?.accessToken) })
    // Returning users with Spotify can skip the service picker
    if (spotifyAuth?.accessToken) navigate('top-artists')
    else navigate('connect-services')
  }

  // From Connect Services → continue to whichever taste source is available.
  // Spotify connected = use top artists API. Otherwise manual seed.
  const handleConnectServicesContinue = () => {
    if (spotifyAuth?.accessToken) navigate('top-artists')
    else navigate('manual-seed')
  }

  // Manual seed → loading → swipe (uses the same discovery flow but
  // remembers that the user came from manual-seed, not top-artists,
  // so error bounces go back to the right screen.)
  const handleManualSeedStart = (seedArtists) => {
    handleTopArtistsConfirm([], seedArtists, 'manual-seed')
  }

  // Connect-or-Pick handlers
  const handleConnectFromOnboarding = () => handleConnectSpotify('top-artists')

  // Seed artists currently being matched against (for loading screen display)
  const [loadingSeeds, setLoadingSeeds] = useState([])

  // Which screen was visible when the user kicked off loading. We keep it
  // rendered behind the curtain for the close phase (~0.7s) so the curtains
  // collapse OVER the user's current view, not over a flash of the next one.
  const [loadingPrev, setLoadingPrev] = useState(null)

  // Minimum time we hold the loading screen so the curtain animation
  // completes even if the API is fast. Matches the 6.6s CSS animation.
  const MIN_LOADING_MS = 6600

  async function holdAtLeast(startedAt) {
    const elapsed = Date.now() - startedAt
    if (elapsed < MIN_LOADING_MS) {
      await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed))
    }
  }

  // Confirm seeds → run discovery. `sourceScreen` is where the user came
  // from so we can route back there on error (was hardcoded 'top-artists',
  // which broke manual-seed users — they got bounced to the Spotify screen).
  const handleTopArtistsConfirm = async (derivedGenres, seedArtists, sourceScreen = 'top-artists') => {
    setSelectedGenres(derivedGenres)
    setLoadingSeeds(seedArtists || [])
    setLoadingPrev(sourceScreen)
    navigate('loading')
    // Keep prev screen rendered until curtains have closed over it (~700ms).
    setTimeout(() => setLoadingPrev(null), 700)
    const startedAt = Date.now()
    try {
      Analytics.top_artists_confirm({ count: (seedArtists || []).length, source: sourceScreen })
      const artists = await fetchArtists({ seedArtists, genres: derivedGenres })
      await holdAtLeast(startedAt)
      if (!artists || artists.length === 0) throw new Error('empty_queue')
      setQueue(artists)
      navigate('swipe')
    } catch (err) {
      await holdAtLeast(startedAt)
      navigate(sourceScreen)
      showToast(err?.message === 'empty_queue'
        ? 'Couldn’t find matches — try different seeds'
        : 'Discovery engine hiccupped — try again')
    }
  }

  const handleTopArtistsError = (kind) => {
    if (kind === 'insufficient_scope' || kind === 'session_expired') {
      clearAuth()
      setSpotifyAuth(null)
      showToast(kind === 'session_expired' ? 'Please reconnect Spotify' : 'Permission needed — reconnect Spotify')
      navigate('connect-or-pick')
    }
  }

  // ── Genre selection ────────────────────────────────────────────────
  const handleToggleGenre = (genreId) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    )
  }

  const handleGenreConfirm = async () => {
    setLoadingSeeds([])
    setLoadingPrev('genre')
    navigate('loading')
    setTimeout(() => setLoadingPrev(null), 700)
    const startedAt = Date.now()
    try {
      Analytics.genre_confirm({ count: selectedGenres.length })
      const artists = await fetchArtists({ genres: selectedGenres })
      await holdAtLeast(startedAt)
      if (!artists || artists.length === 0) throw new Error('empty_queue')
      setQueue(artists)
      navigate('swipe')
    } catch (err) {
      await holdAtLeast(startedAt)
      navigate('genre')
      showToast(err?.message === 'empty_queue'
        ? 'No artists found for those genres'
        : 'Discovery engine hiccupped — try again')
    }
  }

  // ── API fetch ──────────────────────────────────────────────────────
  // Calls Last.fm via our serverless function for similar-artist discovery,
  // then enriches each result via Spotify (user token) for preview MP3.
  const fetchArtists = async ({ seedArtists, genres }) => {
    try {
      const params = new URLSearchParams()
      if (seedArtists?.length) params.set('seed', seedArtists.map((a) => a.name || a).join(','))
      if (genres?.length) params.set('genre', genres.join(','))
      params.set('limit', '20')
      const res = await fetch(`/api/artists?${params}`)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const list = data.artists || []
      if (!list.length) throw new Error('Empty response')

      // If user has a Spotify auth, enrich each artist with a real preview URL.
      if (spotifyAuth?.accessToken && data.source === 'lastfm') {
        try {
          return await enrichWithSpotify(list)
        } catch {
          return list // fall through to bare cards (no audio) if enrichment fails
        }
      }
      return list
    } catch {
      return filterArtists(MOCK_ARTISTS, genres || [])
    }
  }

  // ── Swipe actions ──────────────────────────────────────────────────
  // Saving an artist auto-follows them on every connected service. The user
  // already opted in by connecting Spotify / Apple Music / YouTube during
  // onboarding, so no per-save confirmation needed. We fan out in parallel
  // and update the toast with the combined result.
  const handleSave = useCallback((artist) => {
    const tagged = { ...artist, boardId: DEFAULT_BOARD.id }
    setSavedArtists((prev) => {
      if (prev.find((a) => a.id === artist.id)) return prev
      return [...prev, tagged]
    })
    triggerSaveBurst()
    setLastSwipe({ artist: tagged, action: 'save' })
    Analytics.swipe_save({ artist: artist.name })

    // Build the list of services the user has connected.
    const services = []
    if (spotifyAuth?.accessToken) services.push('spotify')
    if (appleAuth?.authorized && isAppleMusicConfigured()) services.push('apple')
    if (isYouTubeAuthValid(youtubeAuth)) services.push('youtube')

    if (services.length === 0) {
      showSaveToast(tagged, 'Connect a music service to auto-follow')
      return
    }

    showSaveToast(tagged, `Following on ${formatServiceList(services)}…`)

    // Kick off all follows in parallel — never block one on another.
    const followCalls = services.map(async (service) => {
      try {
        if (service === 'spotify') {
          const r = await followSpotifyArtist(artist.name)
          if (r.ok) {
            recordAmpLocal(tagged.id, 'spotify_follow')
            postAmplify(tagged, 'spotify_follow')
            Analytics.amplify_spotify_follow({ artist: artist.name })
          }
          return { service, ok: r.ok }
        }
        if (service === 'apple') {
          const r = await addAppleArtistToLibrary(artist.name)
          if (r.ok) {
            recordAmpLocal(tagged.id, 'apple_music_add')
            postAmplify(tagged, 'apple_music_open')
            Analytics.amplify_apple_add({ artist: artist.name })
          }
          return { service, ok: r.ok }
        }
        if (service === 'youtube') {
          const r = await subscribeToArtistChannel(artist.name)
          if (r.ok) {
            recordAmpLocal(tagged.id, 'youtube_subscribe')
            postAmplify(tagged, 'youtube_subscribe')
            Analytics.amplify_youtube_sub({ artist: artist.name })
          }
          return { service, ok: r.ok }
        }
        return { service, ok: false }
      } catch (err) {
        if (err instanceof InsufficientScopeError) {
          return { service, ok: false, reason: 'insufficient_scope' }
        }
        return { service, ok: false, reason: err?.message }
      }
    })

    Promise.allSettled(followCalls).then((results) => {
      const succeeded = results
        .map((r) => r.value)
        .filter((r) => r?.ok)
        .map((r) => r.service)

      let status
      if (succeeded.length === services.length) {
        status = `Followed on ${formatServiceList(succeeded)} ✓`
      } else if (succeeded.length === 0) {
        status = 'Couldn’t follow — try again from Saved'
      } else {
        status = `Followed on ${formatServiceList(succeeded)} · partial`
      }

      setToast((prev) =>
        prev.visible && prev.message === `Saved ${tagged.name}`
          ? { ...prev, status }
          : prev
      )
    })
  }, [screen, spotifyAuth, appleAuth, youtubeAuth])

  // Friendly service-name formatter for status lines.
  const formatServiceList = (services) => {
    const names = services.map((s) => ({
      spotify: 'Spotify',
      apple: 'Apple Music',
      youtube: 'YouTube',
    }[s] || s))
    if (names.length === 1) return names[0]
    if (names.length === 2) return `${names[0]} + ${names[1]}`
    return `${names.slice(0, -1).join(', ')} + ${names.slice(-1)}`
  }

  // Connect / disconnect handlers for the new services
  const handleConnectAppleMusic = async () => {
    try {
      const auth = await authorizeAppleMusic()
      setAppleAuth(auth)
      Analytics.apple_connect({})
      showToast('Connected to Apple Music')
    } catch (err) {
      showToast(err?.message || 'Couldn’t connect to Apple Music')
    }
  }

  const handleDisconnectAppleMusic = async () => {
    await clearAppleAuth()
    setAppleAuth(null)
    showToast('Disconnected from Apple Music')
  }

  const handleConnectYouTube = async () => {
    try {
      const auth = await authorizeYouTube()
      setYoutubeAuth(auth)
      Analytics.youtube_connect({})
      showToast('Connected to YouTube')
    } catch (err) {
      showToast(err?.message || 'Couldn’t connect to YouTube')
    }
  }

  const handleDisconnectYouTube = () => {
    clearYouTubeAuth()
    setYoutubeAuth(null)
    showToast('Disconnected from YouTube')
  }

  const handlePass = useCallback((artist) => {
    setLastSwipe({ artist, action: 'pass' })
    Analytics.swipe_pass({ artist: artist.name })
    showUndoToast(`Skipped ${artist.name}`)
  }, [])

  // ── Board management ──────────────────────────────────────────────
  const handleCreateBoard = (name) => {
    const trimmed = (name || '').trim()
    if (!trimmed) return null
    const id = `board-${Date.now().toString(36)}`
    setBoards((prev) => [...prev, { id, name: trimmed }])
    setCurrentBoardId(id)
    return id
  }

  const handleRenameBoard = (boardId, name) => {
    setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, name } : b)))
  }

  const handleDeleteBoard = (boardId) => {
    if (boardId === DEFAULT_BOARD.id) return
    // Move artists from this board to default
    setSavedArtists((prev) =>
      prev.map((a) => (a.boardId === boardId ? { ...a, boardId: DEFAULT_BOARD.id } : a))
    )
    setBoards((prev) => prev.filter((b) => b.id !== boardId))
    if (currentBoardId === boardId) setCurrentBoardId(DEFAULT_BOARD.id)
  }

  const handleMoveArtist = (artistId, boardId) => {
    setSavedArtists((prev) =>
      prev.map((a) => (a.id === artistId ? { ...a, boardId } : a))
    )
  }

  const handleExpand = useCallback((artist) => {
    setExpandArtist(artist)
    setExpandFromQueue(true)
    navigate('expand')
  }, [])

  // ── Expand actions ────────────────────────────────────────────────
  const handleExpandSave = () => {
    if (expandArtist) {
      handleSave(expandArtist)
      // Remove from queue if came from swipe
      if (expandFromQueue) {
        setQueue((prev) => prev.filter((a) => a.id !== expandArtist.id))
      }
    }
    navigate(expandFromQueue ? 'swipe' : 'saved')
  }

  const handleExpandSkip = () => {
    if (expandFromQueue) {
      setQueue((prev) => prev.filter((a) => a.id !== expandArtist?.id))
    }
    navigate(expandFromQueue ? 'swipe' : 'saved')
  }

  const handleExpandBack = () => {
    navigate(expandFromQueue ? 'swipe' : 'saved')
  }

  // ── Saved screen ───────────────────────────────────────────────────
  const handleSelectSaved = (artist) => {
    setExpandArtist(artist)
    setExpandFromQueue(false)
    navigate('expand')
  }

  const isSaved = expandArtist ? savedArtists.some((a) => a.id === expandArtist.id) : false

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="app">
      {screen === 'splash' && (
        <SplashScreen onStart={handleSplashStart} onOpenManifesto={() => setShowManifesto(true)} onReset={handleReset} />
      )}

      {screen === 'connect-or-pick' && (
        <ConnectOrPickScreen
          onConnectSpotify={handleConnectFromOnboarding}
          onPickGenres={() => navigate('genre')}
          onBack={() => navigate('splash')}
        />
      )}

      {screen === 'connect-services' && (
        <ConnectServicesScreen
          spotifyAuth={spotifyAuth}
          appleAuth={appleAuth}
          youtubeAuth={youtubeAuth}
          onConnectSpotify={handleConnectFromOnboarding}
          onConnectAppleMusic={handleConnectAppleMusic}
          onConnectYouTube={handleConnectYouTube}
          onContinue={handleConnectServicesContinue}
          onPickGenres={() => navigate('genre')}
          onBack={() => navigate('splash')}
        />
      )}

      {screen === 'manual-seed' && (
        <ManualSeedScreen
          onStart={handleManualSeedStart}
          onBack={() => navigate('connect-services')}
        />
      )}

      {/* Top Artists stays rendered during the first ~700ms of loading so the
          curtain collapses OVER it rather than skipping past it. */}
      {(screen === 'top-artists' || (screen === 'loading' && loadingPrev === 'top-artists')) && (
        <TopArtistsScreen
          onStart={handleTopArtistsConfirm}
          onPickGenres={() => navigate('genre')}
          onError={handleTopArtistsError}
          onBack={() => navigate('connect-services')}
          onTypeManually={() => navigate('manual-seed')}
        />
      )}

      {(screen === 'genre' || (screen === 'loading' && loadingPrev === 'genre')) && (
        <GenreScreen
          selectedGenres={selectedGenres}
          onToggleGenre={handleToggleGenre}
          onConfirm={handleGenreConfirm}
        />
      )}

      {/* Swipe screen renders during 'loading' too once the queue is ready,
          so the curtain-open animation reveals the actual first card behind. */}
      {(screen === 'swipe' || (screen === 'loading' && queue.length > 0)) && (
        <SwipeScreen
          queue={queue}
          setQueue={setQueue}
          savedArtists={savedArtists}
          onSave={handleSave}
          onPass={handlePass}
          onExpand={handleExpand}
          onGoSaved={() => navigate('saved')}
          onBackToGenres={() => navigate('genre')}
          onChangeSource={() => navigate('connect-or-pick')}
          isMuted={isMuted}
          audioStarted={audioStarted}
          onAudioTap={handleAudioTap}
          streamMode={streamMode && streamModeReady}
        />
      )}

      {screen === 'expand' && (
        <ExpandScreen
          artist={expandArtist}
          isSaved={isSaved}
          onSave={handleExpandSave}
          onSkip={handleExpandSkip}
          onBack={handleExpandBack}
          playPreview={playPreview}
          pausePreview={pausePreview}
          currentAudioSrc={currentAudioSrc}
          isAudioPlaying={isAudioPlaying}
        />
      )}

      {screen === 'loading' && (
        <LoadingScreen seedArtists={loadingSeeds} />
      )}

      {screen === 'rising' && (
        <RisingScreen onBack={() => navigate(spotifyAuth?.accessToken ? 'saved' : 'splash')} />
      )}

      {screen === 'saved' && (
        <SavedScreen
          savedArtists={savedArtists}
          boards={boards}
          currentBoardId={currentBoardId}
          onSelectBoard={setCurrentBoardId}
          onCreateBoard={handleCreateBoard}
          onRenameBoard={handleRenameBoard}
          onDeleteBoard={handleDeleteBoard}
          onMoveArtist={handleMoveArtist}
          onSelectArtist={handleSelectSaved}
          onBack={() => navigate('swipe')}
          spotifyAuth={spotifyAuth}
          onConnectSpotify={handleConnectSpotify}
          onDisconnectSpotify={handleDisconnectSpotify}
          appleAuth={appleAuth}
          appleConfigured={isAppleMusicConfigured()}
          onConnectAppleMusic={handleConnectAppleMusic}
          onDisconnectAppleMusic={handleDisconnectAppleMusic}
          youtubeAuth={youtubeAuth}
          youtubeConfigured={isYouTubeConfigured()}
          onConnectYouTube={handleConnectYouTube}
          onDisconnectYouTube={handleDisconnectYouTube}
          onExportPlaylist={handleExportPlaylist}
          isExporting={isExporting}
          onOpenImport={handleOpenImport}
          importablePlaylists={importablePlaylists}
          onCloseImport={handleCloseImport}
          onImportPlaylist={handleImportPlaylist}
          isImporting={isImporting}
          onSeeRising={() => navigate('rising')}
          streamMode={streamMode}
          streamModeAvailable={streamModeAvailable}
          streamModeReady={streamModeReady}
          onToggleStreamMode={handleToggleStreamMode}
        />
      )}

      <Toast
        message={toast.message}
        visible={toast.visible}
        actionLabel={toast.actionLabel}
        onAction={toast.onAction}
        status={toast.status}
        secondaryActionLabel={toast.secondaryActionLabel}
        onSecondaryAction={toast.onSecondaryAction}
      />

      {saveBurst && (
        <div className="save-burst" key={saveBurst.id} aria-hidden="true">
          <div className="save-burst-content">
            <div className="save-burst-icon"><IconSave size={120} /></div>
            <div className="save-burst-label">Saved</div>
          </div>
        </div>
      )}

      {showManifesto && <Manifesto onClose={() => setShowManifesto(false)} />}

      {amplifyArtist && (
        <AmplifySheet
          artist={amplifyArtist}
          spotifyConnected={Boolean(spotifyAuth?.accessToken)}
          onUndo={() => {
            handleUndo()
            setAmplifyArtist(null)
          }}
          onClose={() => setAmplifyArtist(null)}
          onSeeRising={() => {
            setAmplifyArtist(null)
            navigate('rising')
          }}
          onError={(reason) => {
            if (reason === 'insufficient_scope') {
              showToast('Reconnect Spotify to enable follow')
            } else if (reason === 'not_connected') {
              showToast('Connect Spotify on Your Finds to follow')
            }
          }}
        />
      )}

      {/* App-level audio element — persists across cards so iOS keeps the
          audio context unlocked after the first user-tap-initiated play */}
      <audio
        ref={audioRef}
        loop
        playsInline
        preload="auto"
        style={{ display: 'none' }}
      />
    </div>
  )
}
