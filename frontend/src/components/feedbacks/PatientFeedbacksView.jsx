/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { FileSpreadsheet, Printer, X } from 'lucide-react'
import PageHeader from '../ui/PageHeader'
import Toolbar from '../ui/Toolbar'
import DataTable from '../ui/DataTable'
import Toast from '../ui/Toast'
import PatientSearchBox from '../patients/PatientSearchBox'
import { formatDate } from '../../utils/formatters'

export default function PatientFeedbacksView({
  items,
  params,
  patients,
  loading,
  viewing,
  toast,
  feedbackCode,
  patientName,
  patientPhone,
  onExportExcel,
  onPrint,
  onUpdateFilters,
  onViewFeedback,
  onCloseFeedback,
  onCloseToast,
}) {
  return (
    <main className="page patient-feedbacks-page">
      <PageHeader
        title="Quản lý phản hồi người bệnh"
        subtitle="Theo dõi phản hồi, cảnh báo và tình trạng xử lý từ người bệnh."
        actions={
          <>
            <button type="button" className="secondary-button" onClick={onExportExcel}>
              <FileSpreadsheet size={18} /> Xuất Excel
            </button>
            <button type="button" className="secondary-button" onClick={onPrint}>
              <Printer size={18} /> Xuất PDF
            </button>
          </>
        }
      />

      <section className="panel list-management-toolbar">
        <Toolbar
          filters={
            <div className="list-management-filters">
              <label className="filter-field filter-field-wide">
                <span>Tìm bệnh nhân trong hồ sơ bệnh án</span>
                <PatientSearchBox
                  patients={patients}
                  value=""
                  queryValue={params.search || ''}
                  onSelect={(patient) => onUpdateFilters({ search: patient ? patient.full_name : '' })}
                  onQueryChange={(keyword) => onUpdateFilters({ search: keyword })}
                  placeholder="Tìm tên, SĐT hoặc mã bệnh nhân"
                />
              </label>
              <label className="filter-field">
                <span>Từ ngày</span>
                <input
                  type="date"
                  value={params.from_date || ''}
                  onChange={(event) => onUpdateFilters({ from_date: event.target.value })}
                />
              </label>
              <label className="filter-field">
                <span>Đến ngày</span>
                <input
                  type="date"
                  value={params.to_date || ''}
                  onChange={(event) => onUpdateFilters({ to_date: event.target.value })}
                />
              </label>
            </div>
          }
        />
      </section>

      <section className="list-stat-grid">
        <article>
          <span>Tổng phản hồi</span>
          <strong>{items.length}</strong>
        </article>
      </section>

      <section className="panel list-management-card">
        <div className="panel-heading">
          <div>
            <h2>Danh sách phản hồi</h2>
          </div>
        </div>
        <DataTable
          columns={[
            { key: 'index', label: 'STT', render: (_item, index) => index + 1 },
            { key: 'feedback_id', label: 'Mã PH', render: (item) => feedbackCode(item) },
            {
              key: 'patient',
              label: 'Bệnh nhân',
              render: (item) => patientName(item),
            },
            { key: 'title', label: 'Tiêu đề' },
            {
              key: 'feedback_date',
              label: 'Ngày gửi',
              render: (item) => formatDate(item.feedback_date || item.created_at),
            },
          ]}
          rows={items}
          loading={loading}
          onView={onViewFeedback}
          emptyTitle="Chưa có phản hồi từ người bệnh"
        />
      </section>

      {viewing && (
        <div className="dialog-backdrop" role="presentation">
          <section className="dialog feedback-detail-dialog" role="dialog" aria-modal="true">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">{feedbackCode(viewing)}</span>
                <h2>{viewing.title || 'Chi tiết phản hồi'}</h2>
                <p>{patientName(viewing)} · {formatDate(viewing.feedback_date || viewing.created_at)}</p>
              </div>
              <button type="button" className="icon-button" title="Đóng" onClick={onCloseFeedback}>
                <X size={18} />
              </button>
            </div>
            <div className="feedback-detail-grid">
              <div>
                <span>Bệnh nhân</span>
                <strong>{patientName(viewing)}</strong>
              </div>
              <div>
                <span>Số điện thoại</span>
                <strong>{patientPhone(viewing)}</strong>
              </div>
              <div className="wide">
                <span>Nội dung phản hồi</span>
                <p>{viewing.content || 'Chưa có nội dung'}</p>
              </div>
            </div>
          </section>
        </div>
      )}

      <Toast toast={toast} onClose={onCloseToast} />
    </main>
  )
}
