export default function Toast({
  message,
  visible,
  actionLabel,
  onAction,
  status,
  secondaryActionLabel,
  onSecondaryAction,
}) {
  const isRich = Boolean(status || secondaryActionLabel)
  return (
    <div className={`toast ${visible ? 'visible' : ''} ${isRich ? 'toast-rich' : ''}`}>
      <div className="toast-body">
        <span className="toast-msg">{message}</span>
        {status && <span className="toast-status">{status}</span>}
      </div>
      <div className="toast-actions">
        {secondaryActionLabel && (
          <button
            className="toast-action toast-action-secondary"
            onClick={onSecondaryAction}
            aria-label={secondaryActionLabel}
          >
            {secondaryActionLabel}
          </button>
        )}
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
    </div>
  )
}
