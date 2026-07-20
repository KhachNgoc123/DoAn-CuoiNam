import { Eye, FileSpreadsheet, Pencil, Plus, Search } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import Toast from '../ui/Toast'
import PatientSearchBox from '../patients/PatientSearchBox'
import { formatDate } from '../../utils/formatters'
import { getPrescriptionStartDate } from '../../utils/prescriptions'

export default function PrescriptionsListView({
  rows,
  params,
  loading,
  toast,
  patients,
  patientCount,
  activeCount,
  completedCount,
  prescriptionPatient,
  prescriptionDoctor,
  prescriptionCode,
  doctorName,
  treatmentDays,
  statusAfterEndDate,
  onExportExcel,
  onCreate,
  onSetParams,
  onRefetch,
  onOpenDetail,
  onEdit,
  onCloseToast,
}) {
  return (
    <main className="page prescriptions-page mc-prescriptions-page">
      <section className="mc-list-hero">
        <div>
          <h1>Quản lý toa thuốc</h1>
        </div>
        <div className="rx-list-actions">
          <button type="button" className="secondary-button prescription-export-button" onClick={onExportExcel}>
            <FileSpreadsheet size={17} /> Excel
          </button>
          <button type="button" className="primary-button prescription-create-button" onClick={onCreate}>
            <Plus size={18} /> Kê toa thuốc
          </button>
        </div>
      </section>

      <section className="rx-filter-card">
        <label>
          <span>Từ khóa</span>
          <div className="mc-filter-input">
            <Search size={17} />
            <PatientSearchBox
              patients={patients}
              value=""
              queryValue={params.search || ''}
              onSelect={(patient) => onSetParams({ search: patient ? patient.full_name : '', page: 1 })}
              onQueryChange={(search) => onSetParams({ search, page: 1 })}
              placeholder="Mã toa, bệnh nhân, số điện thoại"
            />
          </div>
        </label>
        <label>
          <span>Trạng thái</span>
          <select value={params.status || ''} onChange={(event) => onSetParams({ status: event.target.value, page: 1 })}>
            <option value="">Tất cả</option>
            <option value="active">Đang dùng</option>
            <option value="completed">Hoàn thành</option>
          </select>
        </label>
        <label>
          <span>Từ ngày</span>
          <input type="date" value={params.from_date || ''} onChange={(event) => onSetParams({ from_date: event.target.value, page: 1 })} />
        </label>
        <label>
          <span>Đến ngày</span>
          <input type="date" value={params.to_date || ''} onChange={(event) => onSetParams({ to_date: event.target.value, page: 1 })} />
        </label>
        <button type="button" className="mc-search-button" onClick={onRefetch}>
          <Search size={17} /> Tìm kiếm
        </button>
      </section>

      <section className="rx-stat-grid">
        <article>
          <span>Bệnh nhân</span>
          <strong>{patientCount}</strong>
        </article>
        <article>
          <span>Đơn thuốc</span>
          <strong>{rows.length}</strong>
        </article>
        <article>
          <span>Đang dùng</span>
          <strong>{activeCount}</strong>
        </article>
        <article>
          <span>Hoàn thành</span>
          <strong>{completedCount}</strong>
        </article>
      </section>

      <section className="mc-table-panel rx-table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã toa</th>
                <th>Bệnh nhân</th>
                <th>Ngày kê toa</th>
                <th>Bác sĩ</th>
                <th>Chẩn đoán</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Số ngày</th>
                <th>Trạng thái</th>
                <th>Số thuốc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="12">Đang tải danh sách đơn thuốc...</td>
                </tr>
              ) : rows.length ? (
                rows.map((prescription, index) => {
                  const patient = prescriptionPatient(prescription)
                  const doctor = prescriptionDoctor(prescription)

                  return (
                    <tr key={prescription.prescription_id}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{prescriptionCode(prescription)}</strong>
                      </td>
                      <td>
                        <strong>{patient.full_name || '-'}</strong>
                        <small>{patient.phone || ''}</small>
                      </td>
                      <td>{formatDate(getPrescriptionStartDate(prescription)) || '-'}</td>
                      <td>{doctorName(doctor)}</td>
                      <td>{prescription.medical_record?.diagnosis || '-'}</td>
                      <td>{formatDate(prescription.start_date) || '-'}</td>
                      <td>{formatDate(prescription.end_date) || '-'}</td>
                      <td>{treatmentDays(prescription)}</td>
                      <td>
                        <StatusBadge value={statusAfterEndDate(prescription)} />
                      </td>
                      <td>{prescription.details?.length || 0}</td>
                      <td>
                        <div className="mc-row-actions">
                          <button
                            type="button"
                            className="icon-button small"
                            title="Xem chi tiết"
                            onClick={() => onOpenDetail(prescription)}
                          >
                            <Eye size={16} />
                          </button>
                          {prescription.can_modify && (
                            <button
                              type="button"
                              className="icon-button small"
                              title="Sửa toa thuốc"
                              onClick={() => onEdit(prescription)}
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="12">Chưa có đơn thuốc</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Toast toast={toast} onClose={onCloseToast} />
    </main>
  )
}
