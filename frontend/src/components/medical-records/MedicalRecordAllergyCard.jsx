import EmptyState from '../ui/EmptyState'

export default function MedicalRecordAllergyCard({ allergyRows }) {
  return (
    <article className="mc-record-card">
      <h2>Dị ứng thuốc</h2>
      {allergyRows.length ? (
        <div className="mc-record-stack">
          {allergyRows.map((item) => (
            <div className="mc-allergy-box" key={item.id}>
              <strong>{item.medicine_name}</strong>
              <span>{[item.reaction, `Mức độ: ${item.severity}`].filter(Boolean).join(' - ')}</span>
              <small>Nguồn: {item.source || 'Người bệnh cung cấp'}</small>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa ghi nhận dị ứng thuốc" />
      )}
    </article>
  )
}
