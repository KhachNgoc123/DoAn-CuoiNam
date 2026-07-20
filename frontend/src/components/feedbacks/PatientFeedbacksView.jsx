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
        title="Quáº£n lÃ½ pháº£n há»“i ngÆ°á»i bá»‡nh"
        subtitle="Theo dÃµi pháº£n há»“i, cáº£nh bÃ¡o vÃ  tÃ¬nh tráº¡ng xá»­ lÃ½ tá»« ngÆ°á»i bá»‡nh."
        actions={
          <>
            <button type="button" className="secondary-button" onClick={onExportExcel}>
              <FileSpreadsheet size={18} /> Xuáº¥t Excel
            </button>
            <button type="button" className="secondary-button" onClick={onPrint}>
              <Printer size={18} /> Xuáº¥t PDF
            </button>
          </>
        }
      />

      <section className="panel list-management-toolbar">
        <Toolbar
          filters={
            <div className="list-management-filters">
              <label className="filter-field filter-field-wide">
                <span>TÃ¬m bá»‡nh nhÃ¢n trong há»“ sÆ¡ bá»‡nh Ã¡n</span>
                <PatientSearchBox
                  patients={patients}
                  value=""
                  queryValue={params.search || ''}
                  onSelect={(patient) => onUpdateFilters({ search: patient ? patient.full_name : '' })}
                  onQueryChange={(keyword) => onUpdateFilters({ search: keyword })}
                  placeholder="TÃ¬m tÃªn, SÄT hoáº·c mÃ£ bá»‡nh nhÃ¢n"
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
          <span>Tá»•ng pháº£n há»“i</span>
          <strong>{items.length}</strong>
        </article>
      </section>

      <section className="panel list-management-card">
        <div className="panel-heading">
          <div>
            <h2>Danh sÃ¡ch pháº£n há»“i</h2>
          </div>
        </div>
        <DataTable
          columns={[
            { key: 'index', label: 'STT', render: (_item, index) => index + 1 },
            { key: 'feedback_id', label: 'MÃ£ PH', render: (item) => feedbackCode(item) },
            {
              key: 'patient',
              label: 'Bá»‡nh nhÃ¢n',
              render: (item) => patientName(item),
            },
            { key: 'title', label: 'TiÃªu Ä‘á»' },
            {
              key: 'feedback_date',
              label: 'NgÃ y gá»­i',
              render: (item) => formatDate(item.feedback_date || item.created_at),
            },
          ]}
          rows={items}
          loading={loading}
          onView={onViewFeedback}
          emptyTitle="ChÆ°a cÃ³ pháº£n há»“i tá»« ngÆ°á»i bá»‡nh"
        />
      </section>

      {viewing && (
        <div className="dialog-backdrop" role="presentation">
          <section className="dialog feedback-detail-dialog" role="dialog" aria-modal="true">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">{feedbackCode(viewing)}</span>
                <h2>{viewing.title || 'Chi tiáº¿t pháº£n há»“i'}</h2>
                <p>{patientName(viewing)} Â· {formatDate(viewing.feedback_date || viewing.created_at)}</p>
              </div>
              <button type="button" className="icon-button" title="ÄÃ³ng" onClick={onCloseFeedback}>
                <X size={18} />
              </button>
            </div>
            <div className="feedback-detail-grid">
              <div>
                <span>Bá»‡nh nhÃ¢n</span>
                <strong>{patientName(viewing)}</strong>
              </div>
              <div>
                <span>Sá»‘ Ä‘iá»‡n thoáº¡i</span>
                <strong>{patientPhone(viewing)}</strong>
              </div>
              <div className="wide">
                <span>Ná»™i dung pháº£n há»“i</span>
                <p>{viewing.content || 'ChÆ°a cÃ³ ná»™i dung'}</p>
              </div>
            </div>
          </section>
        </div>
      )}

      <Toast toast={toast} onClose={onCloseToast} />
    </main>
  )
}
