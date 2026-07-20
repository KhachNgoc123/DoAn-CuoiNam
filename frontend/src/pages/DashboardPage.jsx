import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import {
  CalendarClock,
  Download,
  FileText,
  Pill,
  Printer,
  Users,
} from 'lucide-react'
import { clearListCache, getDashboard } from '../api/resources'
import LoadingState from '../components/ui/LoadingState'
import Toast from '../components/ui/Toast'
import { formatDate, formatDateTime } from '../utils/formatters'
import { downloadStyledExcel } from '../utils/excelExport'

const PERIOD_OPTIONS = [
  { value: 'day', label: 'HÃ´m nay' },
  { value: 'week', label: 'Tuáº§n nÃ y' },
  { value: 'month', label: 'ThÃ¡ng nÃ y' },
  { value: 'year', label: 'NÄƒm nÃ y' },
]

const REPORT_TYPE_OPTIONS = [
  { value: 'full', label: 'Tá»•ng há»£p' },
  { value: 'patients', label: 'Bá»‡nh nhÃ¢n' },
  { value: 'medical_records', label: 'Há»“ sÆ¡ bá»‡nh Ã¡n' },
  { value: 'prescriptions', label: 'Toa thuá»‘c' },
  { value: 'medication', label: 'Lá»‹ch uá»‘ng thuá»‘c' },
  { value: 'health', label: 'Theo dÃµi sá»©c khá»e' },
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
  if (hour < 11) return 'SÃ¡ng'
  if (hour < 14) return 'TrÆ°a'
  if (hour < 18) return 'Chiá»u'
  return 'Tá»‘i'
}

function buildScheduleRows(schedules) {
  return schedules.flatMap((schedule) => {
    const times = schedule.times?.length ? schedule.times : ['Trong ngÃ y']
    return times.map((time) => {
      const timeText = String(time).slice(0, 5)
      return {
        id: `${schedule.schedule_id}-${timeText}`,
        time: timeText,
        patient: schedule.patient_name || 'Bá»‡nh nhÃ¢n',
        medicine: schedule.medicine_name || '-',
        session: sessionLabel(timeText),
        status: schedule.time_statuses?.[timeText] || 'ChÆ°a nháº¯c',
      }
    })
  })
}

function buildReportRows(data, reportType, scheduleRows, totals) {
  const overviewRows = [
    ['BÃO CÃO Tá»”NG QUAN ÄIá»€U TRá»Š'],
    ['Thá»i gian xuáº¥t', new Date().toLocaleString('vi-VN')],
    ['Pháº¡m vi', data.period_label || 'HÃ´m nay'],
    ['Tá»« ngÃ y', formatDate(data.period_start)],
    ['Äáº¿n ngÃ y', formatDate(data.period_end)],
    [],
    ['Chá»‰ tiÃªu', 'Sá»‘ lÆ°á»£ng'],
    ['Bá»‡nh nhÃ¢n', data.total_patients || 0],
    ['Há»“ sÆ¡ bá»‡nh Ã¡n', data.total_medical_records || 0],
    ['Toa thuá»‘c', data.total_prescriptions || 0],
    ['Lá»‹ch uá»‘ng thuá»‘c', data.medicine_schedules || 0],
    ['Theo dÃµi sá»©c khá»e', data.health_metrics || data.recent_health_metrics?.length || 0],
    ['ÄÃ£ nháº¯c uá»‘ng thuá»‘c', data.medication_reminders_sent || 0],
    ['ÄÃ£ uá»‘ng', data.medication_reminders_taken || 0],
    ['Bá» lá»¡', data.medication_reminders_missed || 0],
    ['Cáº£nh bÃ¡o sá»©c khá»e', data.open_health_alerts || 0],
  ]

  const patientRows = [
    ['DANH SÃCH Bá»†NH NHÃ‚N'],
    ['MÃ£ bá»‡nh nhÃ¢n', 'Há» tÃªn', 'Sá»‘ Ä‘iá»‡n thoáº¡i', 'Giá»›i tÃ­nh', 'NgÃ y sinh', 'Há»“ sÆ¡', 'Toa thuá»‘c', 'Lá»‹ch uá»‘ng', 'Chá»‰ sá»‘'],
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
    ['BÃO CÃO Lá»ŠCH Uá»NG THUá»C'],
    ['Chá»‰ tiÃªu', 'Sá»‘ lÆ°á»£ng'],
    ['Cáº§n uá»‘ng hÃ´m nay', totals.totalDoseTimes],
    ['ÄÃ£ nháº¯c hÃ´m nay', totals.sent],
    ['ÄÃ£ uá»‘ng hÃ´m nay', totals.taken],
    ['Bá» lá»¡ hÃ´m nay', totals.missed],
    ['Tá»· lá»‡ tuÃ¢n thá»§', `${totals.complianceRate}%`],
    [],
    ['Lá»‹ch uá»‘ng hÃ´m nay'],
    ['Giá»', 'Bá»‡nh nhÃ¢n', 'Thuá»‘c', 'Buá»•i', 'Tráº¡ng thÃ¡i'],
    ...scheduleRows.map((row) => [row.time, row.patient, row.medicine, row.session, row.status]),
  ]

  const healthRows = [
    ['BÃO CÃO THEO DÃ•I Sá»¨C KHá»ŽE'],
    ['Bá»‡nh nhÃ¢n', 'Loáº¡i chá»‰ sá»‘', 'GiÃ¡ trá»‹', 'Thá»i gian Ä‘o'],
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

export default function DashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useOutletContext()
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('day')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedDateRange, setAppliedDateRange] = useState({ from_date: '', to_date: '' })
  const [reportType, setReportType] = useState('full')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(() => location.state?.toast || null)

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
        setError('KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u tá»•ng quan. Vui lÃ²ng kiá»ƒm tra API hoáº·c káº¿t ná»‘i database.')
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
    `Tá»· lá»‡ tuÃ¢n thá»§: ${complianceRate}%`,
    `ÄÃ£ uá»‘ng: ${taken} lÆ°á»£t`,
    `Chá» uá»‘ng: ${waiting} lÆ°á»£t`,
    `Bá» lá»¡: ${missed} lÆ°á»£t`,
    `Tá»•ng lá»‹ch: ${totalDoseTimes} lÆ°á»£t`,
  ].join('\n')

  const stats = [
    { label: 'Bá»‡nh nhÃ¢n', value: data?.total_patients || 0, icon: Users, path: '/patients', tone: 'blue' },
    { label: 'Há»“ sÆ¡ bá»‡nh Ã¡n', value: data?.total_medical_records || 0, icon: FileText, path: '/medical-records', tone: 'green' },
    { label: 'Toa thuá»‘c', value: data?.total_prescriptions || 0, icon: Pill, path: '/prescriptions', tone: 'amber' },
    { label: 'Lá»‹ch uá»‘ng', value: data?.medicine_schedules || 0, icon: CalendarClock, path: '/schedules', tone: 'red' },
  ]

  const attentionItems = [
    { title: 'Bá»‡nh nhÃ¢n bá» lá»¡ uá»‘ng thuá»‘c', desc: `${missed} lÆ°á»£t bá» lá»¡ hÃ´m nay`, path: '/schedules' },
    { title: 'Lá»‹ch chÆ°a gá»­i nháº¯c', desc: `${Math.max(totalDoseTimes - sent, 0)} lá»‹ch cáº§n gá»­i trong 30 phÃºt`, path: '/schedules' },
    { title: 'Chá»‰ sá»‘ sá»©c khá»e báº¥t thÆ°á»ng', desc: `${data?.open_health_alerts || 0} cáº£nh bÃ¡o Ä‘ang má»Ÿ`, path: '/health-metrics' },
  ]

  const activityDoctorName = user?.full_name ? ` ${user.full_name}` : 'BÃ¡c sÄ©'

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
      title: 'BÃ¡o cÃ¡o tá»•ng quan Ä‘iá»u trá»‹',
      subtitle: 'Há»‡ thá»‘ng nháº¯c uá»‘ng thuá»‘c vÃ  theo dÃµi sá»©c khá»e bá»‡nh nhÃ¢n',
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
          <h1>Tá»•ng quan Ä‘iá»u trá»‹</h1>
        </div>
        <div className="mc-hero-actions">
          <button type="button" className="mc-export-excel" onClick={exportReport} disabled={loading || !data}>
            <Download size={17} /> Xuáº¥t Excel
          </button>
          <button type="button" className="mc-export-pdf" onClick={() => window.print()}>
            <Printer size={17} /> Xuáº¥t PDF
          </button>
        </div>
      </section>

      <section className="mc-filter-card">
        <label>
          <span>Khoáº£ng thá»i gian</span>
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
          <span>Loáº¡i bÃ¡o cÃ¡o</span>
          <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
            {REPORT_TYPE_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="mc-apply-button" onClick={applyDateFilter}>
          Ãp dá»¥ng
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
                <h2>Thá»‘ng kÃª bá»‡nh nhÃ¢n</h2>
                <span>{data?.period_label || 'Theo thá»i gian'}</span>
              </div>
              <div className="mc-mini-stat-row">
                <div>
                  <span>Tá»•ng bá»‡nh nhÃ¢n</span>
                  <strong>{data?.total_patients || 0}</strong>
                </div>
                <div>
                  <span>Äang Ä‘iá»u trá»‹</span>
                  <strong>{data?.active_medical_records || 0}</strong>
                </div>
                <div>
                  <span>Hoàn thành</span>
                  <strong>{completedPrescriptions}</strong>
                </div>
                <div>
                  <span>Theo dÃµi Ä‘á»‹nh ká»³</span>
                  <strong>{data?.health_metrics || data?.recent_health_metrics?.length || 0}</strong>
                </div>
              </div>
            </article>

            <article className="mc-panel mc-compliance-panel">
              <div className="mc-panel-heading">
                <h2>TuÃ¢n thá»§ lá»‹ch uá»‘ng</h2>
                <span>ThÃ¡ng {new Date().getMonth() + 1}</span>
              </div>
              <div className="mc-donut" style={{ '--percent': `${complianceRate}%` }} title={complianceTooltip}>
                <strong>{complianceRate}%</strong>
              </div>
              <div className="mc-compliance-stats">
                <div>
                  <span>ÄÃ£ uá»‘ng</span>
                  <strong>{complianceRate}%</strong>
                </div>
                <div>
                  <span>Chá»</span>
                  <strong>{totalDoseTimes ? percent(waiting, totalDoseTimes) : 0}%</strong>
                </div>
                <div>
                  <span>Bá» lá»¡</span>
                  <strong>{totalDoseTimes ? percent(missed, totalDoseTimes) : 0}%</strong>
                </div>
              </div>
            </article>

            <article className="mc-panel mc-attention-panel">
              <div className="mc-panel-heading">
                <h2>Cáº§n chÃº Ã½</h2>
                <button type="button" onClick={() => navigate('/schedules')}>Xem táº¥t cáº£</button>
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
                <h2>Hoáº¡t Ä‘á»™ng gáº§n Ä‘Ã¢y</h2>
              </div>
              <div className="mc-timeline">
                {(data?.recent_activities || []).length ? data.recent_activities.map((activity, index) => (
                  <button type="button" key={`${activity.type}-${index}`} onClick={() => navigate(activityPath(activity))}>
                    <span />
                    <strong>{activity.title || 'Hoáº¡t Ä‘á»™ng há»‡ thá»‘ng'}</strong>
                    <small>{`${formatDateTime(activity.time)} Â· ${activity.description || activityDoctorName}`}</small>
                  </button>
                )) : <p className="mc-empty-chart">ChÆ°a cÃ³ dá»¯ liá»‡u</p>}
              </div>
            </article>
          </section>
        </>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
