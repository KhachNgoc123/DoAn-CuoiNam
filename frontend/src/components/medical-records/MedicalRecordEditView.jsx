/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { formatDate } from '../../utils/formatters'
import Toast from '../ui/Toast'
import MedicalRecordForm from './MedicalRecordForm'
import { formatRecordCode } from './medicalRecordHelpers'

/**
 * Hiển thị giao diện MedicalRecordEdit sau khi page đã chuẩn bị dữ liệu.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.record Giá trị record được dùng để render hoặc xử lý tương tác.
 * @param {*} props.patient Giá trị patient được dùng để render hoặc xử lý tương tác.
 * @param {*} props.saving Giá trị saving được dùng để render hoặc xử lý tương tác.
 * @param {*} props.toast Giá trị toast được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onSubmit Giá trị onSubmit được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onCancel Giá trị onCancel được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onCloseToast Giá trị onCloseToast được dùng để render hoặc xử lý tương tác.
 */
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
