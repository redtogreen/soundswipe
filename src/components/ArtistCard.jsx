import { useState, useRef, useCallback, useEffect } from 'react'

const THRESHOLD_RATIO_X = 0.28
const THRESHOLD_RATIO_Y = 0.18
const ROTATION_FACTOR = 0.07

export default function ArtistCard({ artist, stackPosition, isTop, onSwipeLeft, onSwipeRight, onSwipeUp, onSwiped }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [flyDir, setFlyDir] = useState(null) // 'left' | 'right' | 'up' | null
  const startPos = useRef({ x: 0, y: 0 })
  const cardRef = useRef(null)

  // ── Threshold helpers ──────────────────────────────────────────────
  const getThresholds = () => ({
    x: window.innerWidth * THRESHOLD_RATIO_X,
    y: window.innerHeight * THRESHOLD_RATIO_Y,
  })

  // ── Gesture start ──────────────────────────────────────────────────
  const onStart = useCallback((clientX, clientY) => {
    if (!isTop || flyDir) return
    startPos.current = { x: clientX, y: clientY }
    setIsDragging(true)
  }, [isTop, flyDir])

  // ── Gesture move ───────────────────────────────────────────────────
  const onMove = useCallback((clientX, clientY) => {
    if (!isDragging) return
    setOffset({
      x: clientX - startPos.current.x,
      y: clientY - startPos.current.y,
    })
  }, [isDragging])

  // ── Gesture end ────────────────────────────────────────────────────
  const onEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    const { x: tx, y: ty } = getThresholds()

    if (offset.x > tx) {
      triggerSwipe('right')
    } else if (offset.x < -tx) {
      triggerSwipe('left')
    } else if (offset.y < -ty) {
      triggerSwipe('up')
    } else {
      // Spring back
      setOffset({ x: 0, y: 0 })
    }
  }, [isDragging, offset])

  // ── Trigger confirmed swipe ────────────────────────────────────────
  const triggerSwipe = (dir) => {
    setFlyDir(dir)
    if (dir === 'right') onSwipeRight(artist)
    else if (dir === 'up') onSwipeUp(artist)
    // onSwipeLeft has no side effect other than queue removal
    setTimeout(() => {
      if (dir === 'left') onSwipeLeft()
      onSwiped()
    }, 360)
  }

  // ── Mouse events (attached to document while dragging) ─────────────
  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e) => onMove(e.clientX, e.clientY)
    const handleMouseUp = () => onEnd()
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onMove, onEnd])

  // ── Touch event handlers (on card) ────────────────────────────────
  const handleTouchStart = (e) => {
    const t = e.touches[0]
    onStart(t.clientX, t.clientY)
  }
  const handleTouchMove = (e) => {
    e.preventDefault()
    const t = e.touches[0]
    onMove(t.clientX, t.clientY)
  }
  const handleTouchEnd = () => onEnd()

  // ── Mouse down on card ─────────────────────────────────────────────
  const handleMouseDown = (e) => {
    e.preventDefault()
    onStart(e.clientX, e.clientY)
  }

  // ── Compute transform ──────────────────────────────────────────────
  const rotation = isDragging ? offset.x * ROTATION_FACTOR : 0
  const stackScale = stackPosition === 0 ? 1 : stackPosition === 1 ? 0.95 : 0.9
  const stackY = stackPosition === 0 ? 0 : stackPosition === 1 ? 14 : 28

  let transform
  if (flyDir === 'right') {
    transform = `translateX(${window.innerWidth * 1.5}px) translateY(-40px) rotate(28deg)`
  } else if (flyDir === 'left') {
    transform = `translateX(${-window.innerWidth * 1.5}px) translateY(-40px) rotate(-28deg)`
  } else if (flyDir === 'up') {
    transform = `translateY(${-window.innerHeight * 1.3}px) scale(0.9)`
  } else if (isDragging) {
    transform = `translateX(${offset.x}px) translateY(${offset.y}px) rotate(${rotation}deg)`
  } else {
    transform = `translateY(${stackY}px) scale(${stackScale})`
  }

  const transition = isDragging || flyDir
    ? flyDir ? 'transform 0.36s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
    : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'

  // ── Overlay direction & opacity ────────────────────────────────────
  const absX = Math.abs(offset.x)
  const absY = Math.abs(offset.y)
  let overlayDir = null
  let overlayOpacity = 0

  if (isDragging) {
    if (absX > absY && absX > 30) {
      overlayDir = offset.x > 0 ? 'save' : 'pass'
      overlayOpacity = Math.min(1, (absX - 30) / 80)
    } else if (offset.y < -40) {
      overlayDir = 'more'
      overlayOpacity = Math.min(1, (absY - 40) / 80)
    }
  }

  return (
    <div
      ref={cardRef}
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
        className="artist-card-image"
        style={{ backgroundImage: `url(${artist.photo})` }}
      />

      {/* Gradient fade */}
      <div className="artist-card-gradient" />

      {/* Swipe direction overlays */}
      {overlayDir === 'pass' && (
        <div className="swipe-overlay overlay-pass" style={{ opacity: overlayOpacity }}>
          <div className="overlay-label">PASS</div>
        </div>
      )}
      {overlayDir === 'save' && (
        <div className="swipe-overlay overlay-save" style={{ opacity: overlayOpacity }}>
          <div className="overlay-label">SAVE ♥</div>
        </div>
      )}
      {overlayDir === 'more' && (
        <div className="swipe-overlay overlay-more" style={{ opacity: overlayOpacity }}>
          <div className="overlay-label">MORE ↑</div>
        </div>
      )}

      {/* Card content */}
      <div className="artist-card-content">
        <div className="artist-card-genre">{artist.genre}</div>
        <div className="artist-card-name">{artist.name}</div>
        <div className="artist-card-location">
          <span>📍</span>
          <span>{artist.location}</span>
        </div>
        <div className="artist-card-bio">{artist.bio}</div>
        {isTop && (
          <div className="artist-card-hint">
            <span>← skip</span>
            <span style={{ margin: '0 6px', opacity: 0.3 }}>•</span>
            <span>swipe up for more</span>
            <span style={{ margin: '0 6px', opacity: 0.3 }}>•</span>
            <span>save →</span>
          </div>
        )}
      </div>
    </div>
  )
}
