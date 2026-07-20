import { useEffect, useState } from 'react'
import { FileSpreadsheet, Printer, X } from 'lucide-react'
import useResourceList from '../../hooks/useResourceList'
import { getList } from '../../services/resourceService'
import PageHeader from '../../components/common/PageHeader/PageHeader'
import Toolbar from '../../components/common/Toolbar/Toolbar'
import DataTable from '../../components/common/DataTable/DataTable'
import Toast from '../../components/common/Toast/Toast'
import PatientSearchBox from '../../components/patients/PatientSearchBox'
import { formatDate } from '../../utils/formatters'
import { downloadStyledExcel } from '../../utils/excelExport'

function feedbackCode(item) {
  return `PH${String(item.feedback_id || item.id || '').padStart(3, '0')}`
}

function patientName(item) {
  return item.patient?.full_name || item.patient_name || '-'
}

function patientPhone(item) {
  return item.patient?.phone || item.patient_phone || '-'
}

export default function PatientFeedbacksPage() {
  const { items, params, setParams, loading } = useResourceList('/patient-feedbacks', { per_page: 20 })
  const [patients, setPatients] = useState([])
  const [viewing, setViewing] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    getList('/patients', { per_page: 50, scope: 'all' })
      .then((result) => setPatients(result.items))
      .catch(() => setPatients([]))
  }, [])

  function updateFilters(next) {
    setParams({ ...next, page: 1, per_page: 20 })
  }

  function exportExcel() {
    downloadStyledExcel('danh-sach-phan-hoi-nguoi-benh.xls', {
      title: 'Danh sách phản hồi người bệnh',
      rows: [
        ['Danh sách phản hồi'],
        ['STT', 'Mã PH', 'Bệnh nhân', 'Số điện thoại', 'Tiêu đề', 'Ngày gửi', 'Nội dung'],
        ...items.map((item, index) => [
          index + 1,
          feedbackCode(item),
          patientName(item),
          patientPhone(item),
          item.title || '',
          formatDate(item.feedback_date || item.created_at),
          item.content || '',
        ]),
      ],
    })
  }

  return (
    <main className="page patient-feedbacks-page">
      <PageHeader
        title="Quản lý phản hồi người bệnh"
        subtitle="Theo dõi phản hồi, cảnh báo và tình trạng xử lý từ người bệnh."
        actions={
          <>
            <button type="button" className="secondary-button" onClick={exportExcel}>
              <FileSpreadsheet size={18} /> Xuất Excel
            </button>
            <button type="button" className="secondary-button" onClick={() => window.print()}>
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
                  onSelect={(patient) => updateFilters({ search: patient ? patient.full_name : '' })}
                  onQueryChange={(keyword) => updateFilters({ search: keyword })}
                  placeholder="Tìm tên, SĐT hoặc mã bệnh nhân"
                />
              </label>
              <label className="filter-field">
                <span>Từ ngày</span>
                <input
                  type="date"
                  value={params.from_date || ''}
                  onChange={(event) => updateFilters({ from_date: event.target.value })}
                />
              </label>
              <label className="filter-field">
                <span>Đến ngày</span>
                <input
                  type="date"
                  value={params.to_date || ''}
                  onChange={(event) => updateFilters({ to_date: event.target.value })}
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
          onView={(item) => setViewing(item)}
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
              <button type="button" className="icon-button" title="Đóng" onClick={() => setViewing(null)}>
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

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
