/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getList, getOne } from '../../services/resourceService'
import { getErrorMessage } from '../../services/api'
import LoadingState from '../../components/common/Loading/Loading'
import EmptyState from '../../components/common/EmptyState/EmptyState'
import PatientDetailView from '../../components/patients/PatientDetailView'
import {
  EMPTY_TEXT,
  formatDate,
  formatDateTime,
  formatGender,
  formatPatientCode,
  isMedicalRecordInTreatmentStatus,
  statusAfterEndDate,
} from '../../utils/formatters'
import {
  getPrescriptionStartDate,
  getScheduleSessionsFromTimes,
} from '../../utils/prescriptions'
import {
  groupReminderLogsBySchedule,
  reminderStatusForSchedule,
  todayApiDate,
} from '../../utils/medicationReminders'

const ACTIVE_RECORD_MESSAGE =
  'Bệnh nhân đang có một hồ sơ điều trị. Vui lòng hoàn thành điều trị trước khi tạo hồ sơ bệnh án mới.'

function InfoItem({ label, value }) {
  return (
    <div className="patient-profile-item">
      <span>{label}</span>
      <strong>{value || EMPTY_TEXT}</strong>
    </div>
  )
}

function Section({ title, children, actions }) {
  return (
    <section className="mc-patient-tab-panel">
      <div className="mc-patient-tab-heading">
        <h2>{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  )
}

function listNames(items, field) {
  if (!Array.isArray(items) || !items.length) return ''
  return items
    .map((item) => item?.[field] || item?.name || item?.description)
    .filter(Boolean)
    .join(', ')
}

function patientChronicDiseaseText(patient = {}) {
  return listNames(patient.chronic_diseases, 'disease_name') || patient.underlying_disease || ''
}

function patientAllergyText(patient = {}) {
  return listNames(patient.allergies, 'allergy_name') || patient.allergy || ''
}

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'BN'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[parts.length - 2][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
}

function formatPrescriptionCode(prescription) {
  return prescription?.prescription_code || `DT${String(prescription?.prescription_id || '').padStart(3, '0')}`
}

function collectPrescriptions(records) {
  return records.flatMap((record) =>
    (record.prescriptions || []).map((prescription) => ({
      ...prescription,
      medical_record: record,
    })),
  )
}

function collectSchedules(prescriptions) {
  return prescriptions.flatMap((prescription) =>
    (prescription.details || []).flatMap((detail) =>
      (detail.schedules || []).map((schedule) => ({
        ...schedule,
        prescription,
        detail,
      })),
    ),
  )
}

function normalizeMetricText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function metricTypeName(metric) {
  return metric?.health_type?.health_type_name || 'Chỉ số sức khỏe'
}

function metricUnit(metric) {
  return metric?.health_type?.unit || ''
}

function metricValueText(metric) {
  if (!metric) return EMPTY_TEXT
  return `${metric.value || EMPTY_TEXT}${metricUnit(metric) ? ` ${metricUnit(metric)}` : ''}`
}

function metricTime(metric) {
  return new Date(metric?.measure_time || metric?.created_at || 0).getTime()
}

function latestMetricsByType(metrics) {
  const groups = new Map()
  ;[...metrics]
    .sort((left, right) => metricTime(right) - metricTime(left))
    .forEach((metric) => {
      const key = normalizeMetricText(metricTypeName(metric))
      if (!groups.has(key)) groups.set(key, metric)
    })
  return Array.from(groups.values())
}

function parseMetricNumbers(metric) {
  return (
    String(metric?.value || '')
      .match(/-?\d+(\.\d+)?/g)
      ?.map(Number)
      .filter((value) => Number.isFinite(value)) || []
  )
}

function metricHasOpenAlert(metric) {
  return (metric?.alerts || []).some((alert) => alert.status === 'open')
}

function evaluateHealthMetric(metric) {
  const name = normalizeMetricText(metricTypeName(metric))
  const numbers = parseMetricNumbers(metric)
  const firstValue = numbers[0]
  const min = Number(metric?.health_type?.min_value)
  const max = Number(metric?.health_type?.max_value)
  const hasMin = Number.isFinite(min)
  const hasMax = Number.isFinite(max)

  if (metricHasOpenAlert(metric)) return { status: 'warning', message: 'Có cảnh báo sức khỏe đang mở' }

  if (name.includes('huyet ap') || name.includes('blood pressure')) {
    const systolic = numbers[0]
    const diastolic = numbers[1]
    if (Number.isFinite(systolic) && Number.isFinite(diastolic)) {
      if (systolic >= 140 || diastolic >= 90) return { status: 'warning', message: 'Cao hơn ngưỡng bình thường' }
      if (systolic < 90 || diastolic < 60) return { status: 'warning', message: 'Thấp hơn ngưỡng bình thường' }
    }
  }

  if ((name.includes('nhip tim') || name.includes('heart')) && Number.isFinite(firstValue)) {
    if (firstValue > 100) return { status: 'warning', message: 'Cao hơn ngưỡng bình thường' }
    if (firstValue < 60) return { status: 'warning', message: 'Thấp hơn ngưỡng bình thường' }
  }

  if ((name.includes('nhiet do') || name.includes('temperature')) && Number.isFinite(firstValue)) {
    if (firstValue >= 39) return { status: 'warning', message: 'Sốt cao' }
    if (firstValue >= 37.5) return { status: 'warning', message: 'Cao hơn ngưỡng bình thường' }
  }

  if ((name.includes('spo2') || name.includes('oxy')) && Number.isFinite(firstValue) && firstValue < 95) {
    return { status: 'warning', message: 'Thấp hơn ngưỡng bình thường' }
  }

  if (Number.isFinite(firstValue)) {
    if (hasMin && firstValue < min) return { status: 'warning', message: 'Thấp hơn ngưỡng bình thường' }
    if (hasMax && firstValue > max) return { status: 'warning', message: 'Cao hơn ngưỡng bình thường' }
  }

  return { status: 'normal', message: 'Bình thường' }
}

function HealthMetricDialog({ metric, onClose }) {
  if (!metric) return null

  return (
    <div className="dialog-backdrop">
      <section className="dialog patient-info-dialog" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <div>
            <span>Chi tiết chỉ số sức khỏe</span>
            <h2>{metric.health_type?.health_type_name || 'Chỉ số sức khỏe'}</h2>
          </div>
          <button className="icon-button" title="Đóng" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="patient-info-detail-grid">
          <InfoItem label="Loại chỉ số" value={metric.health_type?.health_type_name} />
          <InfoItem label="Giá trị" value={metric.value} />
          <InfoItem label="Đơn vị" value={metric.health_type?.unit} />
          <InfoItem label="Thời gian đo" value={formatDateTime(metric.measure_time)} />
          <InfoItem label="Ghi chú" value={metric.note} />
        </div>
      </section>
    </div>
  )
}

export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewingHealthMetric, setViewingHealthMetric] = useState(null)
  const [activeSection, setActiveSection] = useState('personal')
  const [reminderLogsBySchedule, setReminderLogsBySchedule] = useState(() => new Map())
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getOne('/patients', id)
      .then((data) => {
        if (active) setPatient(data)
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    let active = true
    const date = todayApiDate()

    getList('/medication-reminder-logs', { from_date: date, to_date: date, per_page: 200 })
      .then((result) => {
        if (active) setReminderLogsBySchedule(groupReminderLogsBySchedule(result.items))
      })
      .catch(() => {
        if (active) setReminderLogsBySchedule(new Map())
      })

    return () => {
      active = false
    }
  }, [])

  const records = useMemo(() => patient?.medical_records || [], [patient])
  const prescriptions = useMemo(() => collectPrescriptions(records), [records])
  const schedules = useMemo(() => collectSchedules(prescriptions), [prescriptions])
  const healthMetrics = useMemo(() => patient?.health_metrics || [], [patient?.health_metrics])
  const latestHealthMetrics = useMemo(() => latestMetricsByType(healthMetrics), [healthMetrics])
  const activeTreatmentRecord = useMemo(
    () => records.find((record) => isMedicalRecordInTreatmentStatus(record.status)),
    [records],
  )
  const prescribableRecord = useMemo(
    () => records.find((record) => record.can_prescribe),
    [records],
  )
  const currentStatus = activeTreatmentRecord ? 'Đang điều trị' : records.length ? 'Hoàn thành điều trị' : 'Theo dõi định kỳ'

  const detailTabs = [
    { key: 'personal', label: 'Thông tin cá nhân' },
    { key: 'prescriptions', label: 'Toa thuốc' },
    { key: 'schedules', label: 'Lịch uống thuốc' },
    { key: 'health', label: 'Thông tin sức khỏe' },
    { key: 'records', label: 'Hồ sơ bệnh án' },
    
  ]

  if (loading) return <LoadingState label="Đang tải chi tiết bệnh nhân..." />
  if (error) return <EmptyState title="Không tải được bệnh nhân" description={error} />
  if (!patient) return <EmptyState title="Không tìm thấy bệnh nhân" />

  function createMedicalRecord() {
    if (activeTreatmentRecord) {
      setToast({ type: 'error', message: ACTIVE_RECORD_MESSAGE })
      return
    }
    navigate('/medical-records', {
      state: {
        createPatientId: patient.patient_id,
        patientId: patient.patient_id,
        patientName: patient.full_name,
      },
    })
  }

  function prescribe() {
    if (!prescribableRecord && records.length) {
      setToast({
        type: 'error',
        message: 'Bệnh nhân đã hoàn thành điều trị. Vui lòng tạo hồ sơ bệnh án mới trước khi kê toa.',
      })
      return
    }
    if (!prescribableRecord) {
      setToast({ type: 'error', message: 'Bệnh nhân cần có hồ sơ bệnh án trước khi kê toa.' })
      return
    }
    navigate('/prescriptions', {
      state: {
        mode: 'create',
        recordId: prescribableRecord.record_id,
        record: prescribableRecord,
      },
    })
  }

  return (
    <PatientDetailView
      patient={patient}
      currentStatus={currentStatus}
      activeSection={activeSection}
      setActiveSection={setActiveSection}
      detailTabs={detailTabs}
      records={records}
      prescriptions={prescriptions}
      schedules={schedules}
      healthMetrics={healthMetrics}
      latestHealthMetrics={latestHealthMetrics}
      reminderLogsBySchedule={reminderLogsBySchedule}
      viewingHealthMetric={viewingHealthMetric}
      setViewingHealthMetric={setViewingHealthMetric}
      toast={toast}
      setToast={setToast}
      createMedicalRecord={createMedicalRecord}
      prescribe={prescribe}
      navigate={navigate}
      InfoItem={InfoItem}
      Section={Section}
      HealthMetricDialog={HealthMetricDialog}
      initials={initials}
      formatPatientCode={formatPatientCode}
      patientChronicDiseaseText={patientChronicDiseaseText}
      patientAllergyText={patientAllergyText}
      EMPTY_TEXT={EMPTY_TEXT}
      formatGender={formatGender}
      formatDate={formatDate}
      formatDateTime={formatDateTime}
      formatPrescriptionCode={formatPrescriptionCode}
      getPrescriptionStartDate={getPrescriptionStartDate}
      statusAfterEndDate={statusAfterEndDate}
      reminderStatusForSchedule={reminderStatusForSchedule}
      getScheduleSessionsFromTimes={getScheduleSessionsFromTimes}
      evaluateHealthMetric={evaluateHealthMetric}
      metricTypeName={metricTypeName}
      metricValueText={metricValueText}
    />
  )
}
