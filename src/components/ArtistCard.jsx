import { useState, useRef, useCallback, useEffect } from 'react'

const THRESHOLD_RATIO_X = 0.28
const THRESHOLD_RATIO_Y = 0.18
const ROTATION_FACTOR = 0.06

export default function ArtistCard({
  artist,
  stackPosition,
  isTop,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwiped,
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [flyDir, setFlyDir] = useState(null)
  const startPos = useRef({ x: 0, y: 0 })

  const getThresholds = () => ({
    x: window.innerWidth * THRESHOLD_RATIO_X,
    y: window.innerHeight * THRESHOLD_RATIO_Y,
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
        <div className="artist-card-location">{artist.location}</div>
        <div className="artist-card-bio">{artist.bio}</div>
        {isTop && (
          <div className="artist-card-hint">← pass &nbsp;·&nbsp; ↑ hear more &nbsp;·&nbsp; save →</div>
        )}
      </div>
    </div>
  )
}
