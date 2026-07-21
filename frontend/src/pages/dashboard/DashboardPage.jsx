/**
 * File thuộc nhóm pages, điều phối dữ liệu của từng màn hình trước khi truyền xuống component hiển thị.
 */

import { useEffect, useMemo, useState } from 'react'
/* eslint-disable react-hooks/set-state-in-effect */
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import {
  CalendarClock,
  Download,
  FileText,
  Pill,
  Printer,
  Users,
} from 'lucide-react'
import { clearListCache, getDashboard } from '../../api/resources'
import LoadingState from '../../components/ui/LoadingState'
import Toast from '../../components/ui/Toast'
import { formatDate, formatDateTime } from '../../utils/formatters'
import { downloadStyledExcel } from '../../utils/excelExport'

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'year', label: 'Năm này' },
]

const REPORT_TYPE_OPTIONS = [
  { value: 'full', label: 'Tổng hợp' },
  { value: 'patients', label: 'Bệnh nhân' },
  { value: 'medical_records', label: 'Hồ sơ bệnh án' },
  { value: 'prescriptions', label: 'Toa thuốc' },
  { value: 'medication', label: 'Lịch uống thuốc' },
  { value: 'health', label: 'Theo dõi sức khỏe' },
]

function todayInputValue() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function percent(value, total) {
  if (!total) return 0
  return Math.round((Number(value || 0) / Number(total || 0)) * 100)
}

function sessionLabel(time) {
  const hour = Number.parseInt(String(time || '').slice(0, 2), 10)
  if (hour < 11) return 'Sáng'
  if (hour < 14) return 'Trưa'
  if (hour < 18) return 'Chiều'
  return 'Tối'
}

function buildScheduleRows(schedules) {
  return schedules.flatMap((schedule) => {
    const times = schedule.times?.length ? schedule.times : ['Trong ngày']
    return times.map((time) => {
      const timeText = String(time).slice(0, 5)
      return {
        id: `${schedule.schedule_id}-${timeText}`,
        time: timeText,
        patient: schedule.patient_name || 'Bệnh nhân',
        medicine: schedule.medicine_name || '-',
        session: sessionLabel(timeText),
        status: schedule.time_statuses?.[timeText] || 'Chưa nhắc',
      }
    })
  })
}

function buildReportRows(data, reportType, scheduleRows, totals) {
  const overviewRows = [
    ['BÁO CÁO TỔNG QUAN ĐIỀU TRỊ'],
    ['Thời gian xuất', new Date().toLocaleString('vi-VN')],
    ['Phạm vi', data.period_label || 'Hôm nay'],
    ['Từ ngày', formatDate(data.period_start)],
    ['Đến ngày', formatDate(data.period_end)],
    [],
    ['Chỉ tiêu', 'Số lượng'],
    ['Bệnh nhân', data.total_patients || 0],
    ['Hồ sơ bệnh án', data.total_medical_records || 0],
    ['Toa thuốc', data.total_prescriptions || 0],
    ['Lịch uống thuốc', data.medicine_schedules || 0],
    ['Theo dõi sức khỏe', data.health_metrics || data.recent_health_metrics?.length || 0],
    ['Đã nhắc uống thuốc', data.medication_reminders_sent || 0],
    ['Đã uống', data.medication_reminders_taken || 0],
    ['Bỏ lỡ', data.medication_reminders_missed || 0],
    ['Cảnh báo sức khỏe', data.open_health_alerts || 0],
  ]

  const patientRows = [
    ['DANH SÁCH BỆNH NHÂN'],
    ['Mã bệnh nhân', 'Họ tên', 'Số điện thoại', 'Giới tính', 'Ngày sinh', 'Hồ sơ', 'Toa thuốc', 'Lịch uống', 'Chỉ số'],
    ...((data.report_patients || []).map((patient) => [
      `BN-${String(patient.patient_id || '').padStart(3, '0')}`,
      patient.full_name || '',
      patient.phone || '',
      patient.gender || '',
      formatDate(patient.date_of_birth),
      patient.medical_records_count || 0,
      patient.prescriptions_count || 0,
      patient.medicine_schedules_count || 0,
      patient.health_metrics_count || 0,
    ])),
  ]

  const medicationRows = [
    ['BÁO CÁO LỊCH UỐNG THUỐC'],
    ['Chỉ tiêu', 'Số lượng'],
    ['Cần uống hôm nay', totals.totalDoseTimes],
    ['Đã nhắc hôm nay', totals.sent],
    ['Đã uống hôm nay', totals.taken],
    ['Bỏ lỡ hôm nay', totals.missed],
    ['Tỷ lệ tuân thủ', `${totals.complianceRate}%`],
    [],
    ['Lịch uống hôm nay'],
    ['Giờ', 'Bệnh nhân', 'Thuốc', 'Buổi', 'Trạng thái'],
    ...scheduleRows.map((row) => [row.time, row.patient, row.medicine, row.session, row.status]),
  ]

  const healthRows = [
    ['BÁO CÁO THEO DÕI SỨC KHỎE'],
    ['Bệnh nhân', 'Loại chỉ số', 'Giá trị', 'Thời gian đo'],
    ...((data.recent_health_metrics || []).map((metric) => [
      metric.patient?.full_name || '',
      metric.health_type?.health_type_name || '',
      metric.value || '',
      formatDate(metric.measure_time),
    ])),
  ]

  if (reportType === 'patients') return patientRows
  if (reportType === 'medication') return medicationRows
  if (reportType === 'health') return healthRows
  if (reportType === 'medical_records' || reportType === 'prescriptions') return overviewRows
  return [...overviewRows, [], ...patientRows, [], ...medicationRows, [], ...healthRows]
}

function activityPath(activity) {
  return activity?.path || '/'
}

/**
 * ?i?u ph?i d? li?u v? hi?n th? m?n h?nh Dashboard.
 */
export default function DashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useOutletContext()
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('day')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedDateRange, setAppliedDateRange] = useState({ from_date: '', to_date: '' })
  const [reportType, setReportType] = useState('full')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(() => location.state?.toast || null)

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    clearListCache()
    setLoading(true)
    setError('')
    getDashboard({ period, ...appliedDateRange, _ts: Date.now() })
      .then((payload) => {
        setData(payload)
        setError('')
      })
      .catch(() => {
        setData(null)
        setError('Không tải được dữ liệu tổng quan. Vui lòng kiểm tra API hoặc kết nối database.')
      })
      .finally(() => setLoading(false))
  }, [period, appliedDateRange])

  const medicationOverview = data?.today_medication_overview || {
    total_schedules: 0,
    total_times: 0,
    sessions: [],
  }
  const scheduleRows = useMemo(() => buildScheduleRows(data?.today_schedules || []), [data?.today_schedules])
  const sent = data?.medication_reminders_sent || 0
  const taken = data?.medication_reminders_taken || 0
  const missed = data?.medication_reminders_missed || 0
  const totalDoseTimes = medicationOverview.total_times || medicationOverview.total_schedules || 0
  const waiting = Math.max(totalDoseTimes - taken - missed, 0)
  const complianceRate = sent ? percent(taken, sent) : data?.medication_compliance_rate || 0
  const completedPrescriptions = data?.completed_prescriptions ?? Math.max((data?.total_prescriptions || 0) - (data?.active_prescriptions || 0), 0)
  const complianceTooltip = [
    `Tỷ lệ tuân thủ: ${complianceRate}%`,
    `Đã uống: ${taken} lượt`,
    `Chờ uống: ${waiting} lượt`,
    `Bỏ lỡ: ${missed} lượt`,
    `Tổng lịch: ${totalDoseTimes} lượt`,
  ].join('\n')

  const stats = [
    { label: 'Bệnh nhân', value: data?.total_patients || 0, icon: Users, path: '/patients', tone: 'blue' },
    { label: 'Hồ sơ bệnh án', value: data?.total_medical_records || 0, icon: FileText, path: '/medical-records', tone: 'green' },
    { label: 'Toa thuốc', value: data?.total_prescriptions || 0, icon: Pill, path: '/prescriptions', tone: 'amber' },
    { label: 'Lịch uống', value: data?.medicine_schedules || 0, icon: CalendarClock, path: '/schedules', tone: 'red' },
  ]

  const attentionItems = [
    { title: 'Bệnh nhân bỏ lỡ uống thuốc', desc: `${missed} lượt bỏ lỡ hôm nay`, path: '/schedules' },
    { title: 'Lịch chưa gửi nhắc', desc: `${Math.max(totalDoseTimes - sent, 0)} lịch cần gửi trong 30 phút`, path: '/schedules' },
    { title: 'Chỉ số sức khỏe bất thường', desc: `${data?.open_health_alerts || 0} cảnh báo đang mở`, path: '/health-metrics' },
  ]

  const activityDoctorName = user?.full_name ? ` ${user.full_name}` : 'Bác sĩ'

  async function exportReport() {
    if (!data) return
    clearListCache()
    const reportData = data.report_patients
      ? data
      : await getDashboard({ include_report: 1, period, ...appliedDateRange, _ts: Date.now() })
    const rows = buildReportRows(reportData, reportType, scheduleRows, {
      totalDoseTimes,
      sent,
      taken,
      missed,
      complianceRate,
    })
    downloadStyledExcel(`bao-cao-tong-quan-${new Date().toISOString().slice(0, 10)}.xls`, {
      title: 'Báo cáo tổng quan điều trị',
      subtitle: 'Hệ thống nhắc uống thuốc và theo dõi sức khỏe bệnh nhân',
      rows,
    })
  }

  function applyDateFilter() {
    setAppliedDateRange({ from_date: fromDate, to_date: toDate })
  }

  return (
    <main className="page dashboard-page mc-dashboard">
      <section className="mc-dashboard-hero">
        <div>
          <h1>Tổng quan điều trị</h1>
        </div>
        <div className="mc-hero-actions">
          <button type="button" className="mc-export-excel" onClick={exportReport} disabled={loading || !data}>
            <Download size={17} /> Xuất Excel
          </button>
          <button type="button" className="mc-export-pdf" onClick={() => window.print()}>
            <Printer size={17} /> Xuất PDF
          </button>
        </div>
      </section>

      <section className="mc-filter-card">
        <label>
          <span>Khoảng thời gian</span>
          <select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value)
              setFromDate('')
              setToDate('')
              setAppliedDateRange({ from_date: '', to_date: '' })
            }}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Từ ngày</span>
          <input
            type="date"
            value={fromDate}
            max={toDate || todayInputValue()}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label>
          <span>Đến ngày</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            max={todayInputValue()}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>
        <label>
          <span>Loại báo cáo</span>
          <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
            {REPORT_TYPE_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="mc-apply-button" onClick={applyDateFilter}>
          Áp dụng
        </button>
      </section>

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
          <section className="mc-stat-row">
            {stats.map((item) => {
              const Icon = item.icon
              return (
                <button
                  type="button"
                  className="mc-stat-card"
                  data-tone={item.tone}
                  key={item.label}
                  onClick={() => navigate(item.path)}
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

          <section className="mc-dashboard-grid">
            <article className="mc-panel mc-patient-chart">
              <div className="mc-panel-heading">
                <h2>Thống kê bệnh nhân</h2>
                <span>{data?.period_label || 'Theo thời gian'}</span>
              </div>
              <div className="mc-mini-stat-row">
                <div>
                  <span>Tổng bệnh nhân</span>
                  <strong>{data?.total_patients || 0}</strong>
                </div>
                <div>
                  <span>Đang điều trị</span>
                  <strong>{data?.active_medical_records || 0}</strong>
                </div>
                <div>
                  <span>Hoàn thành</span>
                  <strong>{completedPrescriptions}</strong>
                </div>
                <div>
                  <span>Theo dõi định kỳ</span>
                  <strong>{data?.health_metrics || data?.recent_health_metrics?.length || 0}</strong>
                </div>
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
                <div>
                  <span>Đã uống</span>
                  <strong>{complianceRate}%</strong>
                </div>
                <div>
                  <span>Chờ</span>
                  <strong>{totalDoseTimes ? percent(waiting, totalDoseTimes) : 0}%</strong>
                </div>
                <div>
                  <span>Bỏ lỡ</span>
                  <strong>{totalDoseTimes ? percent(missed, totalDoseTimes) : 0}%</strong>
                </div>
              </div>
            </article>

            <article className="mc-panel mc-attention-panel">
              <div className="mc-panel-heading">
                <h2>Cần chú ý</h2>
                <button type="button" onClick={() => navigate('/schedules')}>Xem tất cả</button>
              </div>
              <div className="mc-attention-list">
                {attentionItems.map((item) => (
                  <button type="button" key={item.title} onClick={() => navigate(item.path)}>
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
                  <button type="button" key={`${activity.type}-${index}`} onClick={() => navigate(activityPath(activity))}>
                    <span />
                    <strong>{activity.title || 'Hoạt động hệ thống'}</strong>
                    <small>{`${formatDateTime(activity.time)} · ${activity.description || activityDoctorName}`}</small>
                  </button>
                )) : <p className="mc-empty-chart">Chưa có dữ liệu</p>}
              </div>
            </article>
          </section>
        </>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
