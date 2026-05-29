import { useState, useCallback, useRef, useEffect } from 'react'
import { MOCK_ARTISTS } from './data/mockArtists.js'
import SplashScreen from './screens/SplashScreen.jsx'
import GenreScreen from './screens/GenreScreen.jsx'
import SwipeScreen from './screens/SwipeScreen.jsx'
import ExpandScreen from './screens/ExpandScreen.jsx'
import SavedScreen from './screens/SavedScreen.jsx'
import Toast from './components/Toast.jsx'
import Manifesto from './components/Manifesto.jsx'
import { IconSave } from './components/Icons.jsx'
import { beginAuth, handleRedirect, getStoredAuth, clearAuth } from './lib/spotify-auth.js'
import { createPlaylistFromFinds, syncPlaylist, getMyPlaylists, getPlaylistTracks, InsufficientScopeError } from './lib/spotify-api.js'

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
  const [screen, setScreen] = useState('splash') // splash | genre | swipe | expand | saved
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

  // Update audio src whenever the top swipe-card changes, and try to play.
  // First card on iOS will fail silently — user taps the audio button to start.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const topCard = screen === 'swipe' ? queue[0] : null
    const previewUrl = topCard?.previewUrl || null
    if (previewUrl) {
      if (audio.src !== previewUrl) audio.src = previewUrl
      audio.volume = isMuted ? 0 : 1
      audio.play()
        .then(() => setAudioStarted(true))
        .catch(() => { /* autoplay blocked — first tap will start it */ })
    } else {
      audio.pause()
    }
    // We intentionally don't depend on isMuted here — separate effect handles it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, screen])

  // Apply mute changes to live audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : 1
  }, [isMuted])

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
        // Land on Saved screen so user sees their connected state
        setScreen('saved')
        showToast(`Connected as ${result.auth.profile?.displayName || 'Spotify'}`)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConnectSpotify = () => {
    beginAuth().catch((err) => {
      showToast(err.message || 'Could not start Spotify sign-in')
    })
  }

  const handleDisconnectSpotify = () => {
    clearAuth()
    setSpotifyAuth(null)
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
  const [toast, setToast] = useState({ message: '', visible: false, actionLabel: null, onAction: null })
  const toastTimer = useRef(null)

  const showToast = (message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, visible: true, actionLabel: null, onAction: null })
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 2200)
  }

  const showSaveToast = (artist, onHearMore) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({
      message: `${artist.name} → added to your finds`,
      visible: true,
      actionLabel: 'Hear more →',
      onAction: () => {
        if (toastTimer.current) clearTimeout(toastTimer.current)
        setToast((prev) => ({ ...prev, visible: false }))
        onHearMore()
      },
    })
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 4000)
  }

  // Save-burst overlay (heart flash) — key remounts to retrigger animation
  const [saveBurst, setSaveBurst] = useState(null)
  const burstTimer = useRef(null)
  const triggerSaveBurst = () => {
    if (burstTimer.current) clearTimeout(burstTimer.current)
    setSaveBurst({ id: Date.now() })
    burstTimer.current = setTimeout(() => setSaveBurst(null), 800)
  }

  // ── Navigation helpers ─────────────────────────────────────────────
  const navigate = (to) => {
    setPrevScreen(screen)
    setScreen(to)
  }

  // ── Splash → Genre ─────────────────────────────────────────────────
  const handleSplashStart = () => navigate('genre')

  // ── Genre selection ────────────────────────────────────────────────
  const handleToggleGenre = (genreId) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    )
  }

  const handleGenreConfirm = () => {
    // Fetch from API (falls back to mock if API unavailable)
    fetchArtists(selectedGenres).then((artists) => {
      setQueue(artists)
      navigate('swipe')
    })
  }

  // ── API fetch (with mock fallback) ────────────────────────────────
  const fetchArtists = async (genres) => {
    try {
      const params = new URLSearchParams({ genre: genres.join(','), limit: 20 })
      const res = await fetch(`/api/artists?${params}`)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      if (data.artists && data.artists.length > 0) return data.artists
      throw new Error('Empty response')
    } catch {
      // Fallback to mock data
      return filterArtists(MOCK_ARTISTS, genres)
    }
  }

  // ── Swipe actions ──────────────────────────────────────────────────
  const handleSave = useCallback((artist) => {
    const tagged = { ...artist, boardId: DEFAULT_BOARD.id }
    setSavedArtists((prev) => {
      if (prev.find((a) => a.id === artist.id)) return prev
      return [...prev, tagged]
    })
    triggerSaveBurst()
    showSaveToast(tagged, () => {
      setExpandArtist(tagged)
      setExpandFromQueue(false)
      navigate('expand')
    })
  }, [screen])

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

      {screen === 'genre' && (
        <GenreScreen
          selectedGenres={selectedGenres}
          onToggleGenre={handleToggleGenre}
          onConfirm={handleGenreConfirm}
        />
      )}

      {screen === 'swipe' && (
        <SwipeScreen
          queue={queue}
          setQueue={setQueue}
          savedArtists={savedArtists}
          onSave={handleSave}
          onExpand={handleExpand}
          onGoSaved={() => navigate('saved')}
          onBackToGenres={() => navigate('genre')}
          isMuted={isMuted}
          audioStarted={audioStarted}
          onAudioTap={handleAudioTap}
        />
      )}

      {screen === 'expand' && (
        <ExpandScreen
          artist={expandArtist}
          isSaved={isSaved}
          onSave={handleExpandSave}
          onSkip={handleExpandSkip}
          onBack={handleExpandBack}
        />
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
          onExportPlaylist={handleExportPlaylist}
          isExporting={isExporting}
          onOpenImport={handleOpenImport}
          importablePlaylists={importablePlaylists}
          onCloseImport={handleCloseImport}
          onImportPlaylist={handleImportPlaylist}
          isImporting={isImporting}
        />
      )}

      <Toast
        message={toast.message}
        visible={toast.visible}
        actionLabel={toast.actionLabel}
        onAction={toast.onAction}
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
