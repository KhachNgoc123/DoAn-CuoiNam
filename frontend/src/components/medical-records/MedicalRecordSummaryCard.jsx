/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { formatDate } from '../../utils/formatters'
import StatusBadge from '../ui/StatusBadge'
import { formatRecordCode } from './medicalRecordHelpers'
import RecordInfoItem from './RecordInfoItem'

/**
 * Hiển thị component MedicalRecordSummaryCard trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.record Giá trị record được dùng để render hoặc xử lý tương tác.
 */
export default function MedicalRecordSummaryCard({ record }) {
  return (
    <article className="mc-record-card">
      <div className="mc-record-title-row">
        <h2>Thông tin hồ sơ</h2>
        <StatusBadge value={record.status} />
      </div>
      <div className="record-info-grid">
        <RecordInfoItem label="Mã hồ sơ" value={formatRecordCode(record)} />
        <RecordInfoItem label="Ngày khám" value={formatDate(record.visit_date)} />
        <RecordInfoItem label="Triệu chứng" value={record.symptoms || record.chief_complaint} />
        <RecordInfoItem label="Chẩn đoán" value={record.diagnosis} />
        <RecordInfoItem label="Ghi chú bác sĩ" value={record.doctor_note} />
      </div>
    </article>
  )
}
