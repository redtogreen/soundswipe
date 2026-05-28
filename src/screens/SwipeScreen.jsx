import { useCallback } from 'react'
import ArtistCard from '../components/ArtistCard.jsx'
import { IconSkip, IconHear, IconSave, IconCircles } from '../components/Icons.jsx'

export default function SwipeScreen({ queue, setQueue, savedArtists, onSave, onExpand, onGoSaved }) {
  const visible = queue.slice(0, 3)

  const handleSwiped = useCallback(() => {
    setQueue(prev => prev.slice(1))
  }, [setQueue])

  const handleSwipeRight = useCallback((artist) => {
    onSave(artist)
  }, [onSave])

  const handleSwipeLeft = useCallback(() => {}, [])

  const handleSwipeUp = useCallback((artist) => {
    onExpand(artist)
  }, [onExpand])

  const triggerSkip = () => { if (queue.length) setQueue(prev => prev.slice(1)) }
  const triggerSave = () => { if (queue.length) { onSave(queue[0]); setQueue(prev => prev.slice(1)) } }
  const triggerMore = () => { if (queue.length) onExpand(queue[0]) }

  const genreLabel = queue[0]?.genre || ''

  return (
    <div className="screen swipe-screen">
      {/* Status bar */}
      <div className="status-bar">
        <span className="status-bar-time">9:41</span>
      </div>

      {/* Amber masthead */}
      <div className="masthead">
        <span className="masthead-logo">SoundSwipe</span>
        <span className="masthead-label">{genreLabel}</span>
      </div>

      {/* Card stack */}
      <div className="card-stack-area">
        {queue.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><IconCircles size={72} /></div>
            <h3>All Caught Up</h3>
            <p>You've heard every artist in this genre. Try a new genre or check your saved artists.</p>
          </div>
        ) : (
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
        <button
          className="action-btn action-skip"
          onClick={triggerSkip}
          disabled={queue.length === 0}
          title="Skip"
          aria-label="Skip"
        >
          <IconSkip size={22} />
        </button>

        <button
          className="action-btn action-more"
          onClick={triggerMore}
          disabled={queue.length === 0}
          title="Hear more"
          aria-label="Hear more"
        >
          <IconHear size={22} />
        </button>

        <button
          className="action-btn action-save"
          onClick={triggerSave}
          disabled={queue.length === 0}
          title="Save artist"
          aria-label="Save artist"
        >
          <IconSave size={26} />
        </button>

        {/* Saved tally */}
        <button className="swipe-saved-tally" onClick={onGoSaved}>
          <span className="tally-num">{savedArtists.length}</span>
          <span className="tally-label">Saved</span>
        </button>
      </div>
    </div>
  )
}
