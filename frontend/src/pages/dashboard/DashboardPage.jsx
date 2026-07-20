/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import {
  CalendarClock,
  FileText,
  Pill,
  Users,
} from 'lucide-react'
import { clearListCache, getDashboard } from '../../services/resourceService'
import DashboardView from '../../components/dashboard/DashboardView'
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
    <DashboardView
      data={data}
      loading={loading}
      error={error}
      toast={toast}
      period={period}
      fromDate={fromDate}
      toDate={toDate}
      reportType={reportType}
      periodOptions={PERIOD_OPTIONS}
      reportTypeOptions={REPORT_TYPE_OPTIONS}
      todayInputValue={todayInputValue}
      stats={stats}
      completedPrescriptions={completedPrescriptions}
      complianceRate={complianceRate}
      complianceTooltip={complianceTooltip}
      totalDoseTimes={totalDoseTimes}
      waiting={waiting}
      missed={missed}
      percent={percent}
      attentionItems={attentionItems}
      activityDoctorName={activityDoctorName}
      activityPath={activityPath}
      formatDateTime={formatDateTime}
      onPeriodChange={(value) => {
        setPeriod(value)
        setFromDate('')
        setToDate('')
        setAppliedDateRange({ from_date: '', to_date: '' })
      }}
      onFromDateChange={setFromDate}
      onToDateChange={setToDate}
      onReportTypeChange={setReportType}
      onApply={applyDateFilter}
      onExportReport={exportReport}
      onPrint={() => window.print()}
      onNavigate={navigate}
      onCloseToast={() => setToast(null)}
    />
  )
}
