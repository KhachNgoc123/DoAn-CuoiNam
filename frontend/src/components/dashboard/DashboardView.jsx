import { Download, Printer } from 'lucide-react'
import LoadingState from '../common/Loading/Loading'
import Toast from '../common/Toast/Toast'

function DashboardFilters({
  period,
  fromDate,
  toDate,
  reportType,
  periodOptions,
  reportTypeOptions,
  todayInputValue,
  onPeriodChange,
  onFromDateChange,
  onToDateChange,
  onReportTypeChange,
  onApply,
}) {
  return (
    <section className="mc-filter-card">
      <label>
        <span>Khoảng thời gian</span>
        <select value={period} onChange={(event) => onPeriodChange(event.target.value)}>
          {periodOptions.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Từ ngày</span>
        <input type="date" value={fromDate} max={toDate || todayInputValue()} onChange={(event) => onFromDateChange(event.target.value)} />
      </label>
      <label>
        <span>Đến ngày</span>
        <input
          type="date"
          value={toDate}
          min={fromDate || undefined}
          max={todayInputValue()}
          onChange={(event) => onToDateChange(event.target.value)}
        />
      </label>
      <label>
        <span>Loại báo cáo</span>
        <select value={reportType} onChange={(event) => onReportTypeChange(event.target.value)}>
          {reportTypeOptions.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="mc-apply-button" onClick={onApply}>
        Áp dụng
      </button>
    </section>
  )
}

function DashboardStats({ stats, onNavigate }) {
  return (
    <section className="mc-stat-row">
      {stats.map((item) => {
        const Icon = item.icon
        return (
          <button
            type="button"
            className="mc-stat-card"
            data-tone={item.tone}
            key={item.label}
            onClick={() => onNavigate(item.path)}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <i>
              <Icon size={22} />
            </i>
          </button>
        )
      })}
    </section>
  )
}

function DashboardPanels({
  data,
  completedPrescriptions,
  complianceRate,
  complianceTooltip,
  totalDoseTimes,
  waiting,
  missed,
  percent,
  attentionItems,
  activityDoctorName,
  activityPath,
  formatDateTime,
  onNavigate,
}) {
  return (
    <section className="mc-dashboard-grid">
      <article className="mc-panel mc-patient-chart">
        <div className="mc-panel-heading">
          <h2>Thống kê bệnh nhân</h2>
          <span>{data?.period_label || 'Theo thời gian'}</span>
        </div>
        <div className="mc-mini-stat-row">
          <div><span>Tổng bệnh nhân</span><strong>{data?.total_patients || 0}</strong></div>
          <div><span>Đang điều trị</span><strong>{data?.active_medical_records || 0}</strong></div>
          <div><span>Hoàn thành</span><strong>{completedPrescriptions}</strong></div>
          <div><span>Theo dõi định kỳ</span><strong>{data?.health_metrics || data?.recent_health_metrics?.length || 0}</strong></div>
        </div>
      </article>

      <article className="mc-panel mc-compliance-panel">
        <div className="mc-panel-heading">
          <h2>Tuân thủ lịch uống</h2>
          <span>Tháng {new Date().getMonth() + 1}</span>
        </div>
        <div className="mc-donut" style={{ '--percent': `${complianceRate}%` }} title={complianceTooltip}>
          <strong>{complianceRate}%</strong>
        </div>
        <div className="mc-compliance-stats">
          <div><span>Đã uống</span><strong>{complianceRate}%</strong></div>
          <div><span>Chờ</span><strong>{totalDoseTimes ? percent(waiting, totalDoseTimes) : 0}%</strong></div>
          <div><span>Bỏ lỡ</span><strong>{totalDoseTimes ? percent(missed, totalDoseTimes) : 0}%</strong></div>
        </div>
      </article>

      <article className="mc-panel mc-attention-panel">
        <div className="mc-panel-heading">
          <h2>Cần chú ý</h2>
          <button type="button" onClick={() => onNavigate('/schedules')}>Xem tất cả</button>
        </div>
        <div className="mc-attention-list">
          {attentionItems.map((item) => (
            <button type="button" key={item.title} onClick={() => onNavigate(item.path)}>
              <span />
              <strong>{item.title}</strong>
              <small>{item.desc}</small>
            </button>
          ))}
        </div>
      </article>

      <article className="mc-panel mc-activity-panel">
        <div className="mc-panel-heading">
          <h2>Hoạt động gần đây</h2>
        </div>
        <div className="mc-timeline">
          {(data?.recent_activities || []).length ? data.recent_activities.map((activity, index) => (
            <button type="button" key={`${activity.type}-${index}`} onClick={() => onNavigate(activityPath(activity))}>
              <span />
              <strong>{activity.title || 'Hoạt động hệ thống'}</strong>
              <small>{`${formatDateTime(activity.time)} · ${activity.description || activityDoctorName}`}</small>
            </button>
          )) : <p className="mc-empty-chart">Chưa có dữ liệu</p>}
        </div>
      </article>
    </section>
  )
}

export default function DashboardView(props) {
  const {
    data,
    loading,
    error,
    toast,
    onCloseToast,
    onExportReport,
    onPrint,
    onNavigate,
    stats,
  } = props

  return (
    <main className="page dashboard-page mc-dashboard">
      <section className="mc-dashboard-hero">
        <div>
          <h1>Tổng quan điều trị</h1>
        </div>
        <div className="mc-hero-actions">
          <button type="button" className="mc-export-excel" onClick={onExportReport} disabled={loading || !data}>
            <Download size={17} /> Xuất Excel
          </button>
          <button type="button" className="mc-export-pdf" onClick={onPrint}>
            <Printer size={17} /> Xuất PDF
          </button>
        </div>
      </section>

      <DashboardFilters {...props} />

      {loading ? (
        <section className="mc-dashboard-loading-panel">
          <LoadingState />
        </section>
      ) : error ? (
        <section className="mc-dashboard-loading-panel">
          <div className="mc-empty-chart">{error}</div>
        </section>
      ) : (
        <>
          <DashboardStats stats={stats} onNavigate={onNavigate} />
          <DashboardPanels {...props} />
        </>
      )}

      <Toast toast={toast} onClose={onCloseToast} />
    </main>
  )
}

