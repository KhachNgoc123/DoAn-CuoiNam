/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

export default function LoadingState({ label = 'Đang tải dữ liệu...' }) {
  return (
    <div className="state-box loading-state">
      <span className="spinner" />
      <strong>{label}</strong>
    </div>
  )
}
