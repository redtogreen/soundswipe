import { useState, useCallback } from 'react'
import ArtistCard from '../components/ArtistCard.jsx'

export default function SwipeScreen({ queue, setQueue, savedArtists, onSave, onExpand, onGoSaved }) {
  // Shown cards: top 3 from queue
  const visible = queue.slice(0, 3)

  const handleSwiped = useCallback(() => {
    setQueue(prev => prev.slice(1))
  }, [setQueue])

  const handleSwipeRight = useCallback((artist) => {
    onSave(artist)
  }, [onSave])

  const handleSwipeLeft = useCallback(() => {
    // no-op — just removal handled by handleSwiped
  }, [])

  const handleSwipeUp = useCallback((artist) => {
    onExpand(artist)
  }, [onExpand])

  // Button-triggered swipes (uses key trick to remount card and trigger animation)
  const [forcedSwipe, setForcedSwipe] = useState(null)

  const triggerSkip = () => {
    if (queue.length === 0) return
    setQueue(prev => prev.slice(1))
  }

  const triggerSave = () => {
    if (queue.length === 0) return
    onSave(queue[0])
    setQueue(prev => prev.slice(1))
  }

  const triggerMore = () => {
    if (queue.length === 0) return
    onExpand(queue[0])
  }

  const genreLabel = queue[0]?.genre || ''

  return (
    <div className="screen swipe-screen">
      {/* Header */}
      <div className="swipe-header">
        <span className="swipe-logo">Sound<span>Swipe</span></span>
        <span className="swipe-genre-badge">{genreLabel}</span>
      </div>

      {/* Card stack */}
      <div className="card-stack-area">
        {queue.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎵</div>
            <h3>You've Heard It All</h3>
            <p>You've gone through every artist in this genre. Check your saved artists or try a new genre.</p>
          </div>
        ) : (
          // Render in reverse so highest z-index (top card) is last in DOM
          [...visible].reverse().map((artist, reversedIdx) => {
            const stackPosition = (visible.length - 1) - reversedIdx
            return (
              <ArtistCard
                key={artist.id}
                artist={artist}
                stackPosition={stackPosition}
                isTop={stackPosition === 0}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onSwipeUp={handleSwipeUp}
                onSwiped={handleSwiped}
              />
            )
          })
        )}
      </div>

      {/* Action buttons */}
      <div className="swipe-actions">
        {/* Skip */}
        <button
          className="action-btn action-skip"
          onClick={triggerSkip}
          title="Skip"
          disabled={queue.length === 0}
        >
          ✕
        </button>

        {/* More info */}
        <button
          className="action-btn action-more"
          onClick={triggerMore}
          title="Hear more"
          disabled={queue.length === 0}
        >
          ♫
        </button>

        {/* Save */}
        <button
          className="action-btn action-save"
          onClick={triggerSave}
          title="Save artist"
          disabled={queue.length === 0}
        >
          ♥
        </button>

        {/* Saved list shortcut */}
        <div className="swipe-saved-btn">
          <button className="saved-count-btn" onClick={onGoSaved}>
            <span className="saved-count-num">{savedArtists.length}</span>
            <span>Saved</span>
          </button>
        </div>
      </div>
    </div>
  )
}
