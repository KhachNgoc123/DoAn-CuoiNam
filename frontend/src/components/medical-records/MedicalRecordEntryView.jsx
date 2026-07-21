/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import Toast from '../ui/Toast'
import MedicalRecordForm from './MedicalRecordForm'

export default function MedicalRecordEntryView({
  editingRecord,
  formPatient,
  patients,
  healthTypes,
  recordSuggestions,
  saving,
  toast,
  onSubmit,
  onDraftChange,
  onCancel,
  onCloseToast,
}) {
  return (
    <main className="page medical-record-entry-page">
      <section className="mc-list-hero">
        <div>
          <h1>{editingRecord?.id ? 'Chỉnh sửa hồ sơ bệnh án' : 'Thêm hồ sơ bệnh án'}</h1>
          <p>Nhập triệu chứng, chẩn đoán, ghi chú và các chỉ số cơ bản của lần khám.</p>
        </div>
      </section>
      <section className="medical-record-entry-surface">
        <MedicalRecordForm
          initialValue={{ ...editingRecord, patient: formPatient }}
          patients={patients}
          healthTypes={healthTypes}
          recordSuggestions={recordSuggestions}
          loading={saving}
          onSubmit={onSubmit}
          onDraftChange={onDraftChange}
          onCancel={onCancel}
        />
      </section>
      <Toast toast={toast} onClose={onCloseToast} />
    </main>
  )
}
