/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

export default function EmptyState({
  title = 'Chưa có dữ liệu',
  description = 'Khi có dữ liệu mới, danh sách sẽ hiển thị tại đây.',
  action,
}) {
  return (
    <div className="state-box empty-state">
      <strong>{title}</strong>
      <span>{description}</span>
      {action}
    </div>
  )
}
