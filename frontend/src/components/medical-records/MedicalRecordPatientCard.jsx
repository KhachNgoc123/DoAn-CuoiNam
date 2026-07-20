import { formatDate, formatGender, formatPatientCode } from '../../utils/formatters'
import RecordInfoItem from './RecordInfoItem'

export default function MedicalRecordPatientCard({ patient, record }) {
  return (
    <article className="mc-record-card">
      <h2>Thông tin bệnh nhân</h2>
      <div className="record-info-grid compact">
        <RecordInfoItem label="Mã bệnh nhân" value={formatPatientCode(patient || { patient_id: record.patient_id })} />
        <RecordInfoItem label="Họ tên" value={patient.full_name} />
        <RecordInfoItem label="Giới tính" value={formatGender(patient.gender)} />
        <RecordInfoItem label="Ngày sinh" value={formatDate(patient.date_of_birth)} />
        <RecordInfoItem label="Số điện thoại" value={patient.phone} className="wide" />
        <RecordInfoItem label="Địa chỉ" value={patient.address} className="wide" />
      </div>
    </article>
  )
}
