import { formatDate, statusAfterEndDate } from '../../utils/formatters'
import EmptyState from '../ui/EmptyState'
import StatusBadge from '../ui/StatusBadge'
import { formatPrescriptionCode, prescriptionMedicineText } from './medicalRecordHelpers'

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
