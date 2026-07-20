
export default function Modal({ title, children, actions, onClose }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true">
        {title || onClose ? (
          <div className="dialog-header">
            {title ? <h2>{title}</h2> : <span />}
            {onClose ? (
              <button type="button" className="icon-button" title="Đóng" onClick={onClose}>
                x
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
        {actions ? <div className="dialog-actions">{actions}</div> : null}
      </section>
    </div>
  )
}
