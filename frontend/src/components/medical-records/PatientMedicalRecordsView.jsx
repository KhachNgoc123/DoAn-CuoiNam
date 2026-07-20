import { Eye } from 'lucide-react'
import { formatDate, formatPatientCode } from '../../utils/formatters'
import EmptyState from '../common/EmptyState/EmptyState'
import LoadingState from '../common/Loading/Loading'
import StatusBadge from '../common/StatusBadge/StatusBadge'

function formatRecordCode(record) {
  return record?.record_code || `BA-${String(record?.record_id || '').padStart(3, '0')}`
}

function Detail({ label, value, emphasis = false }) {
  return (
    <div className={`patient-record-detail${emphasis ? ' emphasis' : ''}`}>
      <span>{label}</span>
      <p>{value || 'Chưa có thông tin'}</p>
    </div>
  )
}

export default function PatientMedicalRecordsView({
  records,
  loading,
  onView,
}) {
  if (loading) return <LoadingState />
  if (!records.length) return <EmptyState title="Bệnh nhân chưa có hồ sơ bệnh án" />

  return (
    <section className="patient-record-list">
      {records.map((record) => (
        <article className="patient-record-card" key={record.record_id}>
          <header className="patient-record-card-header">
            <div>
              <span>
                Hồ sơ bệnh án {formatRecordCode(record)} · Ngày tạo {formatDate(record.visit_date)}
              </span>
              <h2>{record.diagnosis || 'Chưa có chẩn đoán'}</h2>
              <p>Bác sĩ: {record.doctor?.full_name || '-'}</p>
            </div>
            <div className="patient-record-card-actions">
              <StatusBadge value={record.status} />
              <button className="secondary-button" onClick={() => onView(record)}>
                <Eye size={16} /> Xem đầy đủ
              </button>
            </div>
          </header>

          <div className="patient-record-meta">
            <div>
              <span>Mã hồ sơ</span>
              <strong>{formatRecordCode(record)}</strong>
            </div>
            <div>
              <span>Mã bệnh nhân</span>
              <strong>{formatPatientCode(record.patient || { patient_id: record.patient_id })}</strong>
            </div>
            <div>
              <span>Ngày tạo hồ sơ</span>
              <strong>{formatDate(record.visit_date)}</strong>
            </div>
            <div>
              <span>Trạng thái</span>
              <strong>{record.status || 'Chưa có thông tin'}</strong>
            </div>
            <div>
              <span>Tài liệu</span>
              <strong>{record.documents?.length || 0} tệp</strong>
            </div>
            <div>
              <span>Toa thuốc</span>
              <strong>{record.prescriptions?.length || 0} toa</strong>
            </div>
          </div>

          <div className="patient-record-detail-grid">
            <Detail label="Chẩn đoán" value={record.diagnosis} emphasis />
            <Detail label="Ghi chú bác sĩ" value={record.doctor_note} />
          </div>

          <div className="patient-record-related">
            <div>
              <h3>Toa thuốc đã kê</h3>
              {record.prescriptions?.length ? (
                record.prescriptions.map((prescription) => (
                  <p key={prescription.prescription_id}>
                    <strong>Toa #{prescription.prescription_id}:</strong>{' '}
                    {prescription.details
                      ?.map((detail) => detail.medicine?.medicine_name)
                      .filter(Boolean)
                      .join(', ') || 'Chưa có thuốc'}
                  </p>
                ))
              ) : (
                <p>Chưa có toa thuốc.</p>
              )}
            </div>
            <div>
              <h3>Tài liệu bệnh án</h3>
              {record.documents?.length ? (
                record.documents.map((document) => (
                  <p key={document.document_id}>{document.description || document.document_type}</p>
                ))
              ) : (
                <p>Chưa có tài liệu.</p>
              )}
            </div>
          </div>
        </article>
      ))}

    </section>
  )
}
