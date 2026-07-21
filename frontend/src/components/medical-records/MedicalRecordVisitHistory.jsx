/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { formatDate } from '../../utils/formatters'
import EmptyState from '../ui/EmptyState'
import StatusBadge from '../ui/StatusBadge'
import { formatRecordCode } from './medicalRecordHelpers'

/**
 * Hiển thị component MedicalRecordVisitHistory trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.visitHistory Giá trị visitHistory được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onView Giá trị onView được dùng để render hoặc xử lý tương tác.
 */
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
