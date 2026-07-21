/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { Eye, Pencil, Plus } from 'lucide-react'
import { formatDate, formatGender, formatPatientCode } from '../../utils/formatters'

/**
 * Hiển thị giao diện PatientsList sau khi page đã chuẩn bị dữ liệu.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.patients Giá trị patients được dùng để render hoặc xử lý tương tác.
 * @param {*} props.loading Giá trị loading được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onCreate Giá trị onCreate được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onEdit Giá trị onEdit được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onView Giá trị onView được dùng để render hoặc xử lý tương tác.
 */
export default function PatientsListView({ patients, loading, onCreate, onEdit, onView }) {
  return (
    <main className="page mc-patients-page">
      <section className="mc-list-hero">
        <div>
          <h1>Danh sách bệnh nhân</h1>
        </div>
        <button className="primary-button mc-add-button" onClick={onCreate}>
          <Plus size={18} /> Thêm bệnh nhân
        </button>
      </section>

      <section className="mc-table-panel patient-table-panel">
        <div className="table-wrap">
          <table className="patient-list-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã BN</th>
                <th>Bệnh nhân</th>
                <th>Giới tính</th>
                <th>Ngày sinh</th>
                <th>Địa chỉ</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="patient-table-empty" colSpan="7">
                    Đang tải danh sách bệnh nhân...
                  </td>
                </tr>
              ) : patients.length ? (
                patients.map((patient, index) => (
                  <tr key={patient.patient_id}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{formatPatientCode(patient)}</strong>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span>{patient.full_name || '-'}</span>
                        <small>{patient.phone || ''}</small>
                      </div>
                    </td>
                    <td>{formatGender(patient.gender)}</td>
                    <td>{formatDate(patient.date_of_birth)}</td>
                    <td>{patient.address || '-'}</td>
                    <td>
                      <div className="mc-row-actions">
                        <button
                          type="button"
                          className="icon-button small"
                          title="Xem chi tiết"
                          onClick={() => onView(patient)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button small"
                          title="Sửa bệnh nhân"
                          onClick={() => onEdit(patient)}
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="patient-table-empty" colSpan="7">
                    Chưa có bệnh nhân
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
