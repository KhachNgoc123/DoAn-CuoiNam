import { formatDate } from '../../utils/formatters'
import Toast from '../ui/Toast'
import MedicalRecordForm from './MedicalRecordForm'
import { formatRecordCode } from './medicalRecordHelpers'

export default function MedicalRecordEditView({ record, patient, saving, toast, onSubmit, onCancel, onCloseToast }) {
  return (
    <main className="page medical-record-entry-page">
      <section className="mc-list-hero">
        <div>
          <h1>Cập nhật hồ sơ bệnh án</h1>
          <p>
            {formatRecordCode(record)} - Ngày khám {formatDate(record.visit_date)}
          </p>
        </div>
      </section>
      <section className="medical-record-entry-surface">
        <MedicalRecordForm
          initialValue={record}
          patients={[patient]}
          loading={saving}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </section>
      <Toast toast={toast} onClose={onCloseToast} />
    </main>
  )
}
