
export default function ErrorState({ title = "Không tải được dữ liệu", description }) {
  return (
    <div className="empty-state error-state">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  )
}
