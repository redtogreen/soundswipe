import { useState, useRef, useCallback, useEffect } from 'react'
import { IconAudioOn, IconAudioOff } from './Icons.jsx'

const THRESHOLD_RATIO_X = 0.28
const THRESHOLD_RATIO_Y = 0.18
const ROTATION_FACTOR = 0.06

export default function ArtistCard({
  artist,
  stackPosition,
  isTop,
  isMuted,
  onToggleMute,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwiped,
}) {
  const iframeRef = useRef(null)
  const widgetRef = useRef(null)
  const audioRef = useRef(null)
  const [audioPaused, setAudioPaused] = useState(true)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [flyDir, setFlyDir] = useState(null)
  const startPos = useRef({ x: 0, y: 0 })

  const getThresholds = () => ({
    // Cap thresholds so swipes work on wide browsers too
    x: Math.min(window.innerWidth * THRESHOLD_RATIO_X, 130),
    y: Math.min(window.innerHeight * THRESHOLD_RATIO_Y, 120),
  })

  const onStart = useCallback((clientX, clientY) => {
    if (!isTop || flyDir) return
    startPos.current = { x: clientX, y: clientY }
    setIsDragging(true)
  }, [isTop, flyDir])

  const onMove = useCallback((clientX, clientY) => {
    if (!isDragging) return
    setOffset({ x: clientX - startPos.current.x, y: clientY - startPos.current.y })
  }, [isDragging])

  const triggerSwipe = (dir) => {
    setFlyDir(dir)
    if (dir === 'right') onSwipeRight(artist)
    else if (dir === 'up') onSwipeUp(artist)
    setTimeout(() => {
      if (dir === 'left') onSwipeLeft()
      onSwiped()
    }, 360)
  }

  const onEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    const { x: tx, y: ty } = getThresholds()
    if (offset.x > tx) triggerSwipe('right')
    else if (offset.x < -tx) triggerSwipe('left')
    else if (offset.y < -ty) triggerSwipe('up')
    else setOffset({ x: 0, y: 0 })
  }, [isDragging, offset])

  useEffect(() => {
    if (!isDragging) return
    const onMouseMove = (e) => onMove(e.clientX, e.clientY)
    const onMouseUp = () => onEnd()
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [isDragging, onMove, onEnd])

  // ── Audio: keep mute state in sync for both audio paths ────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : 1
    if (widgetRef.current) widgetRef.current.setVolume(isMuted ? 0 : 100)
  }, [isMuted])

  // Start playback on whichever audio path exists. Must be called from
  // either an autoplay attempt (works on desktop) or a user gesture
  // (required on iOS Safari).
  const startPlayback = () => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : 1
      audioRef.current.play()
        .then(() => setAudioPaused(false))
        .catch(() => { /* still paused — user tap will retry from gesture */ })
    }
    if (widgetRef.current) {
      widgetRef.current.setVolume(isMuted ? 0 : 100)
      widgetRef.current.play()
    }
  }

  // HTML5 audio: try autoplay once metadata is loaded
  const handleAudioLoaded = () => {
    startPlayback()
  }

  // SoundCloud iframe: hook widget API when iframe loads
  const handleIframeLoad = () => {
    if (!window.SC || !iframeRef.current) return
    try {
      const widget = window.SC.Widget(iframeRef.current)
      widgetRef.current = widget
      widget.bind(window.SC.Widget.Events.READY, () => {
        widget.setVolume(isMuted ? 0 : 100)
        widget.play()
      })
      widget.bind(window.SC.Widget.Events.PLAY, () => setAudioPaused(false))
      widget.bind(window.SC.Widget.Events.PAUSE, () => setAudioPaused(true))
      widget.bind(window.SC.Widget.Events.FINISH, () => setAudioPaused(true))
    } catch { /* widget API not ready */ }
  }

  // Audio button: first tap starts playback (works in gesture context on iOS);
  // subsequent taps toggle mute.
  const handleAudioControlClick = (e) => {
    e.stopPropagation()
    if (audioPaused) {
      // Unmute if currently muted, otherwise just start playing
      if (isMuted && onToggleMute) onToggleMute()
      startPlayback()
    } else if (onToggleMute) {
      onToggleMute()
    }
  }

  // The button shows the "muted" speaker icon whenever audio isn't actually
  // playing, so the user has a clear "tap me to start" affordance.
  const showMutedIcon = audioPaused || isMuted

  // Pick the audio source for this top card
  const previewUrl = isTop ? artist.previewUrl : null
  const soundcloudEmbedUrl = isTop && !artist.previewUrl && artist.soundcloudUrl
    ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(artist.soundcloudUrl)}&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false&buying=false&sharing=false&download=false`
    : null
  const hasAudio = Boolean(previewUrl || soundcloudEmbedUrl)

  const handleTouchStart = (e) => { const t = e.touches[0]; onStart(t.clientX, t.clientY) }
  const handleTouchMove = (e) => { e.preventDefault(); const t = e.touches[0]; onMove(t.clientX, t.clientY) }
  const handleTouchEnd = () => onEnd()
  const handleMouseDown = (e) => { e.preventDefault(); onStart(e.clientX, e.clientY) }

  // ── Stack transforms ───────────────────────────────────────────────
  const stackScale = stackPosition === 0 ? 1 : stackPosition === 1 ? 0.96 : 0.92
  const stackY = stackPosition === 0 ? 0 : stackPosition === 1 ? 16 : 32
  const rotation = isDragging ? offset.x * ROTATION_FACTOR : 0

  let transform
  if (flyDir === 'right') {
    transform = `translateX(${window.innerWidth * 1.5}px) translateY(-30px) rotate(25deg)`
  } else if (flyDir === 'left') {
    transform = `translateX(${-window.innerWidth * 1.5}px) translateY(-30px) rotate(-25deg)`
  } else if (flyDir === 'up') {
    transform = `translateY(${-window.innerHeight * 1.4}px) scale(0.92)`
  } else if (isDragging) {
    transform = `translateX(${offset.x}px) translateY(${offset.y}px) rotate(${rotation}deg)`
  } else {
    transform = `translateY(${stackY}px) scale(${stackScale})`
  }

  const transition = isDragging ? 'none'
    : flyDir ? 'transform 0.36s cubic-bezier(0.4, 0, 0.2, 1)'
    : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'

  // ── Overlay ────────────────────────────────────────────────────────
  const absX = Math.abs(offset.x)
  const absY = Math.abs(offset.y)
  let overlayDir = null
  let overlayOpacity = 0

  if (isDragging) {
    if (absX > absY && absX > 28) {
      overlayDir = offset.x > 0 ? 'save' : 'pass'
      overlayOpacity = Math.min(1, (absX - 28) / 70)
    } else if (offset.y < -36) {
      overlayDir = 'more'
      overlayOpacity = Math.min(1, (absY - 36) / 70)
    }
  }

  return (
    <div
      className="artist-card"
      style={{
        transform,
        transition,
        zIndex: 30 - stackPosition,
        pointerEvents: isTop && !flyDir ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Photo */}
      <div
        className="artist-card-photo"
        style={{ backgroundImage: `url(${artist.photo})` }}
      >
        {/* Genre stamp over photo */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
        }}>
          <div className="genre-stamp">{artist.genre}</div>
        </div>

        {/* Audio control — also starts playback on first tap (required by iOS) */}
        {isTop && hasAudio && (
          <button
            className="audio-control"
            onClick={handleAudioControlClick}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            aria-label={audioPaused ? 'Play audio' : isMuted ? 'Unmute audio' : 'Mute audio'}
            title={audioPaused ? 'Tap to play' : isMuted ? 'Unmute' : 'Mute'}
          >
            {showMutedIcon ? <IconAudioOff size={18} /> : <IconAudioOn size={18} />}
          </button>
        )}

        {/* HTML5 audio (Spotify preview MP3) */}
        {previewUrl && (
          <audio
            ref={audioRef}
            src={previewUrl}
            loop
            playsInline
            preload="auto"
            onLoadedData={handleAudioLoaded}
            onPlay={() => setAudioPaused(false)}
            onPause={() => setAudioPaused(true)}
            style={{ display: 'none' }}
          />
        )}

        {/* SoundCloud iframe fallback */}
        {soundcloudEmbedUrl && (
          <iframe
            ref={iframeRef}
            src={soundcloudEmbedUrl}
            allow="autoplay"
            title={`${artist.name} audio preview`}
            onLoad={handleIframeLoad}
            style={{
              position: 'absolute',
              width: 1, height: 1,
              border: 0, opacity: 0,
              pointerEvents: 'none',
              left: -9999, top: -9999,
            }}
          />
        )}

        {/* Photo bottom rule */}
        <div className="artist-card-photo-rule" />
      </div>

      {/* Swipe overlays — rubber stamp style */}
      {overlayDir === 'pass' && (
        <div className="swipe-overlay overlay-pass" style={{ opacity: overlayOpacity }}>
          <div className="overlay-stamp">PASS</div>
        </div>
      )}
      {overlayDir === 'save' && (
        <div className="swipe-overlay overlay-save" style={{ opacity: overlayOpacity }}>
          <div className="overlay-stamp">SAVE ♥</div>
        </div>
      )}
      {overlayDir === 'more' && (
        <div className="swipe-overlay overlay-more" style={{ opacity: overlayOpacity }}>
          <div className="overlay-stamp">MORE ↑</div>
        </div>
      )}

      {/* Text content */}
      <div className="artist-card-content">
        <div className="artist-card-name">{artist.name}</div>
        {artist.location && <div className="artist-card-location">{artist.location}</div>}
        {artist.bio && <div className="artist-card-bio">{artist.bio}</div>}
        {isTop && (
          <div className="artist-card-hint">← pass &nbsp;·&nbsp; ↑ hear more &nbsp;·&nbsp; save →</div>
        )}
      </div>
    </div>
  )
}
