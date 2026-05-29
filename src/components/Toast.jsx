export default function Toast({ message, visible, actionLabel, onAction }) {
  return (
    <div className={`toast ${visible ? 'visible' : ''}`}>
      <span className="toast-msg">{message}</span>
      {actionLabel && (
        <button
          className="toast-action"
          onClick={onAction}
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
