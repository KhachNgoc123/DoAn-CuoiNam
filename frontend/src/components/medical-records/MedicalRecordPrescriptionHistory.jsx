/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { formatDate, statusAfterEndDate } from '../../utils/formatters'
import EmptyState from '../ui/EmptyState'
import StatusBadge from '../ui/StatusBadge'
import { formatPrescriptionCode, prescriptionMedicineText } from './medicalRecordHelpers'

/**
 * Hiển thị component MedicalRecordPrescriptionHistory trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.prescriptions Giá trị prescriptions được dùng để render hoặc xử lý tương tác.
 * @param {*} props.schedules Giá trị schedules được dùng để render hoặc xử lý tương tác.
 */
export default function MedicalRecordPrescriptionHistory({ prescriptions, schedules }) {
  return (
    <article className="mc-record-card mc-record-related-card">
      <h2>Lịch sử toa thuốc</h2>
      {prescriptions.length ? (
        <div className="mc-record-stack">
          {prescriptions.map((prescription) => (
            <div className="mc-prescription-summary" key={prescription.prescription_id}>
              <strong>
                {formatPrescriptionCode(prescription)} - {formatDate(prescription.start_date)}
              </strong>
              <StatusBadge value={statusAfterEndDate(prescription)} />
              <p>{prescriptionMedicineText(prescription)}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa có toa thuốc" />
      )}
      {schedules.length ? (
        <small className="mc-related-note">{schedules.length} lịch uống thuốc đã được tạo từ hồ sơ này.</small>
      ) : null}
    </article>
  )
}
