import { formatDate } from '../../utils/formatters'
import EmptyState from '../ui/EmptyState'
import StatusBadge from '../ui/StatusBadge'
import { formatRecordCode } from './medicalRecordHelpers'

export default function MedicalRecordVisitHistory({ visitHistory, onView }) {
  return (
    <article className="mc-record-card mc-visit-history-card">
      <h2>Lịch sử điều trị</h2>
      {visitHistory.length ? (
        <div className="mc-visit-history-list">
          {visitHistory.map((item) => (
            <button
              type="button"
              className="mc-visit-history-item"
              key={item.record_id || item.id}
              onClick={() => onView(item)}
            >
              <span>{formatRecordCode(item)}</span>
              <strong>{item.diagnosis || 'Chưa chẩn đoán'}</strong>
              <small>{formatDate(item.visit_date || item.created_at)}</small>
              <StatusBadge value={item.status} />
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa có lịch sử điều trị" />
      )}
    </article>
  )
}
