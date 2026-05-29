import { useState } from 'react'
import { IconNote, IconCircles, IconSkip } from '../components/Icons.jsx'
import { isConfigured } from '../lib/spotify-auth.js'

export default function SavedScreen({
  savedArtists,
  boards,
  currentBoardId,
  onSelectBoard,
  onCreateBoard,
  onRenameBoard,
  onDeleteBoard,
  onMoveArtist,
  onSelectArtist,
  onBack,
  spotifyAuth,
  onConnectSpotify,
  onDisconnectSpotify,
  onExportPlaylist,
  isExporting,
  onOpenImport,
  importablePlaylists,
  onCloseImport,
  onImportPlaylist,
  isImporting,
}) {
  const connected = Boolean(spotifyAuth?.accessToken)
  const canConnect = isConfigured()
  const currentBoard = boards.find((b) => b.id === currentBoardId) || boards[0]
  const boardArtists = savedArtists.filter((a) => a.boardId === currentBoardId)
  const totalCount = savedArtists.length

  const [moveMenuArtistId, setMoveMenuArtistId] = useState(null)

  const handleCreateBoardClick = () => {
    const name = window.prompt('Board name?', '')
    if (name && name.trim()) onCreateBoard(name)
  }

  const handleDeleteCurrentBoard = () => {
    if (!currentBoard || currentBoard.id === 'all-finds') return
    if (window.confirm(`Delete "${currentBoard.name}"? Its artists will move to All Finds.`)) {
      onDeleteBoard(currentBoard.id)
    }
  }

  return (
    <div className="screen saved-screen">
      <div className="status-bar">
        <span className="status-bar-time">9:41</span>
      </div>

      <div className="masthead">
        <span className="masthead-logo">SoundSwipe</span>
        {totalCount > 0 && (
          <div className="saved-count-badge">{totalCount} {totalCount === 1 ? 'find' : 'finds'}</div>
        )}
      </div>

      <div className="saved-header">
        <div className="eyebrow" style={{ marginBottom: 6 }}>Your private discoveries</div>
        <div className="display-lg">Your<br />Finds</div>
        <div className="rule-heavy" style={{ marginTop: 12 }} />
      </div>

      {/* Board tabs */}
      <div className="board-tabs">
        {boards.map((b) => {
          const count = savedArtists.filter((a) => a.boardId === b.id).length
          const selected = b.id === currentBoardId
          return (
            <button
              key={b.id}
              className={`board-tab ${selected ? 'selected' : ''}`}
              onClick={() => onSelectBoard(b.id)}
            >
              <span className="board-tab-name">{b.name}</span>
              {count > 0 && <span className="board-tab-count">{count}</span>}
            </button>
          )
        })}
        <button className="board-tab board-tab-add" onClick={handleCreateBoardClick} aria-label="Create new board">
          +
        </button>
      </div>

      {/* Spotify connect strip */}
      {canConnect && (
        <div className="spotify-connect">
          {connected ? (
            <>
              <div className="spotify-connect-info">
                {spotifyAuth.profile?.image && (
                  <img src={spotifyAuth.profile.image} alt="" className="spotify-avatar" />
                )}
                <div>
                  <div className="spotify-connect-label">Connected to Spotify</div>
                  <div className="spotify-connect-name">{spotifyAuth.profile?.displayName || 'Connected'}</div>
                </div>
              </div>
              <button className="spotify-connect-secondary" onClick={onDisconnectSpotify}>Disconnect</button>
            </>
          ) : (
            <>
              <div>
                <div className="spotify-connect-label">Take these with you</div>
                <div className="spotify-connect-name">Connect Spotify to sync your finds</div>
              </div>
              <button className="spotify-connect-btn" onClick={onConnectSpotify}>Connect →</button>
            </>
          )}
        </div>
      )}

      {/* Import + sync row (when connected) */}
      {connected && (
        <div className="board-actions">
          <button className="board-action-btn" onClick={onOpenImport}>
            Import from Spotify →
          </button>
          {boardArtists.length > 0 && (
            <button
              className="board-action-btn board-action-primary"
              onClick={onExportPlaylist}
              disabled={isExporting}
            >
              {isExporting
                ? 'Syncing…'
                : currentBoard?.spotifyPlaylistId
                  ? 'Sync to Spotify →'
                  : 'Create Spotify playlist →'}
            </button>
          )}
        </div>
      )}

      {/* Delete board action — for non-default boards */}
      {currentBoard && currentBoard.id !== 'all-finds' && (
        <button
          onClick={handleDeleteCurrentBoard}
          style={{
            background: 'none', border: 'none', padding: '0 24px 6px',
            color: 'var(--ink-ghost)', fontSize: 10, fontWeight: 600,
            letterSpacing: 1.2, textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: 'var(--font-body)', textAlign: 'left', alignSelf: 'flex-start',
          }}
        >
          Delete this board
        </button>
      )}

      {/* List */}
      <div className="saved-list">
        {boardArtists.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><IconCircles size={72} /></div>
            <h3>No finds in this board</h3>
            <p>
              {currentBoardId === 'all-finds'
                ? "Swipe right on the artists you can't stop hearing. They'll show up here."
                : 'Move artists here from another board, or import a Spotify playlist.'}
            </p>
            <button
              className="btn btn-outline"
              onClick={onBack}
              style={{ marginTop: 8, width: 'auto', padding: '12px 24px' }}
            >
              ← Keep Listening
            </button>
          </div>
        ) : (
          <>
            {boardArtists.map((artist) => (
              <div key={artist.id} className="saved-item">
                <div
                  className="saved-thumb"
                  style={{ backgroundImage: artist.photo ? `url(${artist.photo})` : 'none', background: artist.photo ? undefined : 'var(--bg-deep)' }}
                  onClick={() => onSelectArtist(artist)}
                />
                <div className="saved-item-info" onClick={() => onSelectArtist(artist)}>
                  <div className="saved-item-name">{artist.name}</div>
                  <div className="saved-item-track">
                    <IconNote size={11} style={{ verticalAlign: -1, marginRight: 5, display: 'inline-block' }} />
                    {artist.trackName}
                  </div>
                </div>
                <button
                  className="saved-item-menu"
                  onClick={(e) => { e.stopPropagation(); setMoveMenuArtistId(moveMenuArtistId === artist.id ? null : artist.id) }}
                  aria-label="Move to board"
                >
                  ⋯
                </button>
                {moveMenuArtistId === artist.id && (
                  <div className="move-menu" onClick={(e) => e.stopPropagation()}>
                    <div className="move-menu-label">Move to…</div>
                    {boards.filter((b) => b.id !== artist.boardId).map((b) => (
                      <button
                        key={b.id}
                        className="move-menu-item"
                        onClick={() => { onMoveArtist(artist.id, b.id); setMoveMenuArtistId(null) }}
                      >
                        {b.name}
                      </button>
                    ))}
                    <button className="move-menu-item move-menu-cancel" onClick={() => setMoveMenuArtistId(null)}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div style={{ height: 20 }} />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="saved-footer">
        <button className="btn btn-outline" onClick={onBack}>
          ← Keep Listening
        </button>
      </div>

      {/* Import modal */}
      {importablePlaylists !== null && (
        <div className="import-overlay" onClick={onCloseImport}>
          <div className="import-modal" onClick={(e) => e.stopPropagation()}>
            <button className="manifesto-close" onClick={onCloseImport} aria-label="Close">
              <IconSkip size={18} />
            </button>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Bring your playlists in</div>
            <h2 className="import-title">Import from Spotify</h2>
            <div className="rule-medium" style={{ margin: '14px 0' }} />

            {importablePlaylists.length === 0 ? (
              <p style={{ color: 'var(--ink-light)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
                Loading your playlists…
              </p>
            ) : (
              <div className="import-list">
                {importablePlaylists.map((p) => (
                  <div key={p.id} className="import-item">
                    <div
                      className="import-thumb"
                      style={{ backgroundImage: p.image ? `url(${p.image})` : 'none' }}
                    />
                    <div className="import-info">
                      <div className="import-name">{p.name}</div>
                      <div className="import-meta">{p.trackCount} {p.trackCount === 1 ? 'track' : 'tracks'} · {p.owner}</div>
                    </div>
                    <button
                      className="import-btn"
                      onClick={() => onImportPlaylist(p)}
                      disabled={isImporting}
                    >
                      {isImporting ? '…' : 'Import'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
