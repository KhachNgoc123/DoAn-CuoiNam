/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Xóa',
  loadingLabel = 'Đang xử lý...',
  confirmButtonClassName = 'danger-button',
  onCancel,
  onConfirm,
  loading = false,
}) {
  if (!open) return null

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="dialog-actions">
          <button className="secondary-button" disabled={loading} onClick={onCancel}>
            Hủy
          </button>
          <button className={confirmButtonClassName} disabled={loading} onClick={onConfirm}>
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
