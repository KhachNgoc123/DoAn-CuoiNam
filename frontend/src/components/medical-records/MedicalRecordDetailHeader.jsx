import { ArrowLeft, CalendarClock, FileSpreadsheet, Pencil, Pill, Printer } from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import { formatRecordCode } from './medicalRecordHelpers'

export default function MedicalRecordDetailHeader({
  record,
  patient,
  onBack,
  onEdit,
  onPrescribe,
  onExport,
  onPrint,
  onCreateSchedule,
}) {
  return (
    <section className="mc-detail-hero">
      <div>
        <h1>Chi tiết hồ sơ bệnh án</h1>
        <p>
          {formatRecordCode(record)} - Ngày khám {formatDate(record.visit_date)}
        </p>
      </div>
      <div className="mc-detail-actions">
        <button className="secondary-button" onClick={onBack}>
          <ArrowLeft size={16} /> Quay lại
        </button>
        {record.can_edit !== false && (
          <button className="mc-warning-button" onClick={onEdit}>
            <Pencil size={16} /> Cập nhật hồ sơ
          </button>
        )}
        {record.can_prescribe && (
          <button className="primary-button" onClick={onPrescribe}>
            <Pill size={16} /> Kê toa thuốc
          </button>
        )}
        <button className="secondary-button" onClick={onExport}>
          <FileSpreadsheet size={16} /> Excel
        </button>
        <button className="secondary-button" onClick={onPrint}>
          <Printer size={16} /> In hồ sơ
        </button>
        <button className="mc-dark-button" onClick={() => onCreateSchedule(patient?.patient_id || record.patient_id)}>
          <CalendarClock size={16} /> Tạo lịch uống
        </button>
      </div>
    </section>
  )
}
