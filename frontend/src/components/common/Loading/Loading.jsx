export default function LoadingState({ label = 'Đang tải dữ liệu...' }) {
  return (
    <div className="state-box loading-state">
      <span className="spinner" />
      <strong>{label}</strong>
    </div>
  )
}
