import { useEffect, useState } from 'react'
import { IconSkip, IconSave } from './Icons.jsx'
import { followSpotifyArtist, InsufficientScopeError } from '../lib/spotify-api.js'

const AMP_KEY = 'soundswipe_amplifications_v1'

function loadAmps() {
  try { return JSON.parse(localStorage.getItem(AMP_KEY) || '{}') } catch { return {} }
}
function saveAmps(amps) {
  try { localStorage.setItem(AMP_KEY, JSON.stringify(amps)) } catch {}
}

function recordAmp(artistId, action) {
  const amps = loadAmps()
  const current = amps[artistId] || {}
  amps[artistId] = { ...current, [action]: true, lastTouched: Date.now() }
  saveAmps(amps)
}

export default function AmplifySheet({ artist, spotifyConnected, onUndo, onClose, onError }) {
  const [spotifyState, setSpotifyState] = useState('idle')   // idle | loading | done | error
  const [appleClicked, setAppleClicked] = useState(false)
  const [shareClicked, setShareClicked] = useState(false)

  // Auto-close after 12s of no interaction
  useEffect(() => {
    const t = setTimeout(() => onClose(), 12000)
    return () => clearTimeout(t)
  }, [onClose])

  const handleSpotifyFollow = async () => {
    if (!spotifyConnected) {
      if (onError) onError('not_connected')
      return
    }
    if (spotifyState === 'loading' || spotifyState === 'done') return
    setSpotifyState('loading')
    try {
      const result = await followSpotifyArtist(artist.name)
      if (result.ok) {
        recordAmp(artist.id, 'spotify_follow')
        setSpotifyState('done')
      } else {
        setSpotifyState('error')
      }
    } catch (err) {
      if (err instanceof InsufficientScopeError) {
        setSpotifyState('error')
        if (onError) onError('insufficient_scope')
      } else {
        setSpotifyState('error')
      }
    }
  }

  const handleAppleMusic = () => {
    const url = `https://music.apple.com/search?term=${encodeURIComponent(artist.name)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    recordAmp(artist.id, 'apple_music_open')
    setAppleClicked(true)
  }

  const handleShare = async () => {
    const url = `https://soundswipe-pink.vercel.app/`
    const text = `Just discovered ${artist.name} on SoundSwipe. Check them out → ${url}`
    if (navigator.share) {
      try {
        await navigator.share({ title: artist.name, text, url })
        recordAmp(artist.id, 'share')
        setShareClicked(true)
      } catch {
        // user cancelled — don't record
      }
    } else {
      // fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(text)
        recordAmp(artist.id, 'share')
        setShareClicked(true)
      } catch {}
    }
  }

  return (
    <div className="amplify-overlay" onClick={onClose}>
      <div
        className="amplify-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Amplify ${artist.name}`}
      >
        <div className="amplify-header">
          <button className="amplify-undo" onClick={onUndo} aria-label="Undo save">
            ↶ Undo save
          </button>
          <button className="amplify-close" onClick={onClose} aria-label="Close">
            <IconSkip size={16} />
          </button>
        </div>

        <div className="amplify-title-row">
          <div className="amplify-icon-burst" aria-hidden="true">
            <IconSave size={32} />
          </div>
          <div>
            <div className="amplify-eyebrow">Amplify</div>
            <div className="amplify-name">{artist.name}</div>
          </div>
        </div>

        <p className="amplify-pitch">
          Each tap helps grow this artist. Your save means something when it reaches their feed.
        </p>

        <div className="amplify-actions">
          <button
            className={`amplify-action ${spotifyState === 'done' ? 'amplify-done' : ''}`}
            onClick={handleSpotifyFollow}
            disabled={spotifyState === 'loading'}
          >
            <span className="amplify-action-label">
              <strong>Spotify</strong>
              <span className="amplify-action-sub">
                {spotifyState === 'done' ? 'Following ✓' :
                 spotifyState === 'loading' ? 'Following…' :
                 spotifyState === 'error' ? 'Try again' :
                 'Follow on Spotify'}
              </span>
            </span>
            <span className="amplify-action-arrow">{spotifyState === 'done' ? '✓' : '→'}</span>
          </button>

          <button
            className={`amplify-action ${appleClicked ? 'amplify-done' : ''}`}
            onClick={handleAppleMusic}
          >
            <span className="amplify-action-label">
              <strong>Apple Music</strong>
              <span className="amplify-action-sub">{appleClicked ? 'Opened ✓' : 'Open on Apple Music'}</span>
            </span>
            <span className="amplify-action-arrow">{appleClicked ? '✓' : '↗'}</span>
          </button>

          <button
            className={`amplify-action ${shareClicked ? 'amplify-done' : ''}`}
            onClick={handleShare}
          >
            <span className="amplify-action-label">
              <strong>Share</strong>
              <span className="amplify-action-sub">{shareClicked ? 'Shared ✓' : 'Tell someone about them'}</span>
            </span>
            <span className="amplify-action-arrow">{shareClicked ? '✓' : '↗'}</span>
          </button>
        </div>

        <button className="amplify-keep-swiping" onClick={onClose}>
          Keep swiping →
        </button>
      </div>
    </div>
  )
}
