import { useState, useCallback, useRef, useEffect } from 'react'
import { MOCK_ARTISTS } from './data/mockArtists.js'
import SplashScreen from './screens/SplashScreen.jsx'
import GenreScreen from './screens/GenreScreen.jsx'
import SwipeScreen from './screens/SwipeScreen.jsx'
import ExpandScreen from './screens/ExpandScreen.jsx'
import SavedScreen from './screens/SavedScreen.jsx'
import Toast from './components/Toast.jsx'

// Filter artists by selected genres. Falls back to all artists if no match.
function filterArtists(artists, selectedGenres) {
  if (!selectedGenres.length) return [...artists]
  const filtered = artists.filter((a) =>
    a.tags?.some((t) => selectedGenres.includes(t)) ||
    selectedGenres.some((g) => a.genre.toLowerCase().replace(/[\s/&]/g, '-').includes(g))
  )
  return filtered.length ? filtered : [...artists]
}

export default function App() {
  const [screen, setScreen] = useState('splash') // splash | genre | swipe | expand | saved
  const [prevScreen, setPrevScreen] = useState(null)

  const [selectedGenres, setSelectedGenres] = useState([])
  const [queue, setQueue] = useState([])
  const [savedArtists, setSavedArtists] = useState([])
  const [expandArtist, setExpandArtist] = useState(null)
  const [expandFromQueue, setExpandFromQueue] = useState(false) // came from swipe screen?

  // Toast
  const [toast, setToast] = useState({ message: '', visible: false })
  const toastTimer = useRef(null)

  const showToast = (message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, visible: true })
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 2200)
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
    setSavedArtists((prev) => {
      if (prev.find((a) => a.id === artist.id)) return prev
      return [...prev, artist]
    })
    showToast(`♥ Saved ${artist.name}`)
  }, [])

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
        <SplashScreen onStart={handleSplashStart} />
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
          onSelectArtist={handleSelectSaved}
          onBack={() => navigate('swipe')}
        />
      )}

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  )
}
