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
