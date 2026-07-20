import EmptyState from '../ui/EmptyState'

export default function MedicalRecordConditionCard({ chronicRows }) {
  return (
    <article className="mc-record-card">
      <h2>Bệnh nền / tiền sử</h2>
      {chronicRows.length ? (
        <div className="mc-record-stack">
          {chronicRows.map((item) => (
            <div className="record-info-tile" key={item.id}>
              <span>Tên bệnh</span>
              <strong>{item.disease_name}</strong>
              {(item.duration || item.status) && <small>{[item.duration, item.status].filter(Boolean).join(' - ')}</small>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa ghi nhận bệnh nền" />
      )}
    </article>
  )
}
