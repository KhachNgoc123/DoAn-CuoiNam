/**
 * File thuộc nhóm pages, điều phối dữ liệu của từng màn hình trước khi truyền xuống component hiển thị.
 */

import { useEffect, useMemo, useState } from 'react'
/* eslint-disable react-hooks/set-state-in-effect */
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CalendarClock, Eye, HeartPulse, Pill, Plus, Save, Users } from 'lucide-react'
import useResourceList from '../../api/useResourceList'
import { createOne, getList } from '../../api/resources'
import { getErrorMessage } from '../../api/client'
import PageHeader from '../../components/ui/PageHeader'
import Field from '../../components/ui/Field'
import LoadingState from '../../components/ui/LoadingState'
import Toast from '../../components/ui/Toast'
import StatusBadge from '../../components/ui/StatusBadge'
import PatientSearchBox from '../../components/patients/PatientSearchBox'
import { EMPTY_TEXT, formatDate, formatDateTime, formatGender, formatPatientCode } from '../../utils/formatters'

const todayValue = () => new Date().toISOString().slice(0, 10)

const metricFormDefaults = {
  patient_id: '',
  measure_date: todayValue(),
  systolic: '',
  diastolic: '',
  heart_rate: '',
  temperature: '',
  spo2: '',
  weight: '',
  height: '',
  note: '',
}

const metricDefinitions = [
  {
    key: 'systolic',
    label: 'Huyết áp tâm thu',
    shortLabel: 'Huyết áp',
    terms: ['huyet ap tam thu', 'tam thu', 'systolic'],
    unit: 'mmHg',
  },
  {
    key: 'diastolic',
    label: 'Huyết áp tâm trương',
    terms: ['huyet ap tam truong', 'tam truong', 'diastolic'],
    unit: 'mmHg',
  },
  {
    key: 'heart_rate',
    label: 'Nhịp tim',
    terms: ['nhip tim', 'heart rate', 'pulse'],
    unit: 'bpm',
  },
  {
    key: 'temperature',
    label: 'Nhiệt độ',
    terms: ['nhiet do', 'temperature'],
    unit: '°C',
  },
  {
    key: 'spo2',
    label: 'SpO2',
    terms: ['spo2', 'sp o2', 'oxy'],
    unit: '%',
  },
  {
    key: 'blood_sugar',
    label: 'Đường huyết',
    terms: ['duong huyet', 'glucose', 'blood sugar'],
    unit: 'mmol/L',
  },
  {
    key: 'weight',
    label: 'Cân nặng',
    terms: ['can nang', 'weight'],
    unit: 'kg',
  },
  {
    key: 'height',
    label: 'Chiều cao',
    terms: ['chieu cao', 'height'],
    unit: 'cm',
  },
]

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function metricTypeName(metric) {
  return metric.health_type?.health_type_name || metric.healthType?.health_type_name || 'Chỉ số'
}

function metricUnit(metric) {
  return metric.health_type?.unit || metric.healthType?.unit || ''
}

function metricValueText(metric) {
  if (!metric) return EMPTY_TEXT
  const unit = metricUnit(metric)
  return `${metric.value ?? EMPTY_TEXT}${unit ? ` ${unit}` : ''}`
}

function metricDate(metric) {
  return String(metric.measure_time || metric.created_at || '').slice(0, 10)
}

function metricNumericValue(metric) {
  const match = String(metric?.metric_value ?? metric?.value ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

function patientLabel(patient) {
  if (!patient) return EMPTY_TEXT
  return patient.full_name || `Bệnh nhân #${patient.patient_id || patient.id}`
}

function patientCode(patient) {
  const code = formatPatientCode(patient)
  return code === EMPTY_TEXT ? `BN-${String(patient?.patient_id || patient?.id || '').padStart(3, '0')}` : code
}

function patientStatus(patient) {
  const status = normalizeText(patient?.current_record_status || patient?.status || patient?.treatment_status)
  if (!status) return false
  return !['da xong', 'da hoan thanh', 'hoan thanh', 'da huy'].some((value) => status.includes(value))
}

function newestMetrics(metrics, limit = metrics.length) {
  return [...metrics]
    .sort((left, right) => {
      const leftTime = new Date(left.measure_time || left.created_at || 0).getTime()
      const rightTime = new Date(right.measure_time || right.created_at || 0).getTime()
      return rightTime - leftTime
    })
    .slice(0, limit)
}

function findHealthType(healthTypes, terms) {
  return healthTypes.find((type) => {
    const name = normalizeText(type.health_type_name)
    return terms.some((term) => name.includes(normalizeText(term)))
  })
}

function findMetric(group, terms) {
  return group.metrics.find((metric) => {
    const name = normalizeText(metricTypeName(metric))
    return terms.some((term) => name.includes(normalizeText(term)))
  })
}

function metricOpenAlerts(metric) {
  return (metric.alerts || []).filter((alert) => alert.status === 'open')
}

function metricThresholdWarning(metric) {
  const value = metricNumericValue(metric)
  const minValue = Number(metric.health_type?.min_value ?? metric.healthType?.min_value)
  const maxValue = Number(metric.health_type?.max_value ?? metric.healthType?.max_value)
  if (value === null) return ''
  if (!Number.isNaN(maxValue) && value > maxValue) return `${metricTypeName(metric)} cao hơn ngưỡng bình thường`
  if (!Number.isNaN(minValue) && value < minValue) return `${metricTypeName(metric)} thấp hơn ngưỡng bình thường`
  return ''
}

function metricWarnings(metric) {
  const openAlerts = metricOpenAlerts(metric).map((alert) => alert.message).filter(Boolean)
  const threshold = metricThresholdWarning(metric)
  return [...openAlerts, threshold].filter(Boolean)
}

function groupWarnings(group) {
  const seen = new Set()
  return group.metrics
    .flatMap((metric) =>
      metricWarnings(metric).map((message) => ({
        metric,
        message,
        value: metricValueText(metric),
      })),
    )
    .filter((warning) => {
      const key = `${metricTypeName(warning.metric)}:${warning.message}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function groupWarningText(group) {
  const warnings = groupWarnings(group)
  if (!warnings.length) return 'Bình thường'
  return `⚠ ${warnings[0].message}`
}

function bloodPressureText(group) {
  const systolic = findMetric(group, metricDefinitions.find((metric) => metric.key === 'systolic').terms)
  const diastolic = findMetric(group, metricDefinitions.find((metric) => metric.key === 'diastolic').terms)
  if (systolic && diastolic) return `${systolic.value}/${diastolic.value} mmHg`

  const combined = findMetric(group, ['huyet ap', 'blood pressure'])
  return combined ? metricValueText(combined) : EMPTY_TEXT
}

function currentMetricText(group, key) {
  const definition = metricDefinitions.find((metric) => metric.key === key)
  const metric = definition ? findMetric(group, definition.terms) : null
  return metric ? metricValueText(metric) : EMPTY_TEXT
}

function bmiText(group) {
  const weight = metricNumericValue(findMetric(group, metricDefinitions.find((metric) => metric.key === 'weight').terms))
  const height = metricNumericValue(findMetric(group, metricDefinitions.find((metric) => metric.key === 'height').terms))
  if (!weight || !height) return EMPTY_TEXT
  const heightInMeter = height > 3 ? height / 100 : height
  return (weight / (heightInMeter * heightInMeter)).toFixed(1)
}

function groupMetricsByDate(metrics) {
  const grouped = new Map()
  newestMetrics(metrics).forEach((metric) => {
    const date = metricDate(metric) || 'unknown'
    if (!grouped.has(date)) grouped.set(date, [])
    grouped.get(date).push(metric)
  })
  return Array.from(grouped.entries()).map(([date, items]) => ({ date, metrics: items }))
}

function metricForDate(dayMetrics, key) {
  const definition = metricDefinitions.find((metric) => metric.key === key)
  if (!definition) return null
  return dayMetrics.find((metric) => {
    const name = normalizeText(metricTypeName(metric))
    return definition.terms.some((term) => name.includes(normalizeText(term)))
  })
}

function dateHistoryRow(dayMetrics) {
  const fakeGroup = { metrics: dayMetrics }
  return {
    bloodPressure: bloodPressureText(fakeGroup),
    heartRate: metricValueText(metricForDate(dayMetrics, 'heart_rate')),
    temperature: metricValueText(metricForDate(dayMetrics, 'temperature')),
    spo2: metricValueText(metricForDate(dayMetrics, 'spo2')),
  }
}

/**
 * Hiển thị component ActivePrescriptionCard trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.prescriptions Giá trị prescriptions được dùng để render hoặc xử lý tương tác.
 * @param {*} props.loading Giá trị loading được dùng để render hoặc xử lý tương tác.
 * @param {*} props.error Giá trị error được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onViewPrescription Giá trị onViewPrescription được dùng để render hoặc xử lý tương tác.
 */
function ActivePrescriptionCard({ prescriptions, loading, error, onViewPrescription }) {
  return (
    <section className="health-active-prescription-card">
      <div className="health-active-prescription-head">
        <div>
          <span className="health-active-prescription-kicker">Đơn thuốc hiện tại</span>
          <h2>Đơn thuốc đang áp dụng</h2>
        </div>
        <Pill size={22} />
      </div>

      {loading ? (
        <p className="health-active-prescription-empty">Đang tải đơn thuốc đang áp dụng...</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : prescriptions.length ? (
        <div className="health-active-prescription-list">
          {prescriptions.map((prescription) => (
            <article className="health-active-prescription-item" key={prescription.prescription_id}>
              <div className="health-active-prescription-meta">
                <div>
                  <span>Mã đơn thuốc</span>
                  <strong>{prescriptionCode(prescription)}</strong>
                </div>
                <div>
                  <span>Chẩn đoán</span>
                  <strong>{prescription.record?.diagnosis || 'Chưa có chẩn đoán'}</strong>
                </div>
                <div>
                  <span>Bác sĩ kê đơn</span>
                  <strong>{prescription.doctor?.full_name || '-'}</strong>
                </div>
                <div>
                  <span>Thời gian điều trị</span>
                  <strong>{treatmentRange(prescription)}</strong>
                </div>
              </div>

              <div className="health-active-medicine-list">
                <span>Thuốc</span>
                {(prescription.details || []).length ? (
                  <ul>
                    {prescription.details.map((detail) => (
                      <li key={detail.prescription_detail_id}>
                        <span>✓</span>
                        <strong>{detail.medicine_name || 'Thuốc trong toa'}</strong>
                        <small>
                          {[detail.dosage, detail.quantity ? `SL: ${detail.quantity}` : '', detail.frequency, detail.meal_time]
                            .filter(Boolean)
                            .join(' • ')}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Đơn thuốc chưa có thuốc.</p>
                )}
              </div>

              <div className="health-active-prescription-actions">
                <StatusBadge value={prescription.status} />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onViewPrescription(prescription)}
                >
                  <Eye size={16} /> Xem chi tiết đơn thuốc
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="health-active-prescription-empty">Bệnh nhân hiện chưa có đơn thuốc đang áp dụng.</p>
      )}
    </section>
  )
}

function firstMetricDate(group) {
  return group.latestMetric ? formatDate(group.latestMetric.measure_time) : EMPTY_TEXT
}

function prescriptionCode(prescription) {
  return prescription?.code || `DT${String(prescription?.prescription_id || '').padStart(3, '0')}`
}

function treatmentRange(prescription) {
  return [formatDate(prescription?.start_date), formatDate(prescription?.end_date)].filter(Boolean).join(' - ') || EMPTY_TEXT
}

function patientGroupsFromData(patients, metrics, filters) {
  const keyword = normalizeText(filters.search)
  const dateFilter = filters.date

  return patients
    .map((patient) => {
      const patientId = String(patient.patient_id || patient.id)
      const patientMetrics = newestMetrics(
        metrics.filter((metric) => String(metric.patient_id || metric.patient?.patient_id) === patientId),
      )
      const displayMetrics = dateFilter ? patientMetrics.filter((metric) => metricDate(metric) === dateFilter) : patientMetrics
      const group = {
        id: patientId,
        patientId,
        patient,
        metrics: displayMetrics,
        allMetrics: patientMetrics,
        latestMetric: displayMetrics[0] || patientMetrics[0] || null,
      }
      group.hasAlert = groupWarnings(group).length > 0
      return group
    })
    .filter((group) => {
      const searchBody = normalizeText(
        [
          patientLabel(group.patient),
          patientCode(group.patient),
          group.patient.phone,
          group.metrics.map((metric) => `${metricTypeName(metric)} ${metric.value}`).join(' '),
        ].join(' '),
      )
      const matchesSearch = !keyword || searchBody.includes(keyword)
      const matchesStatus =
        !filters.status ||
        (filters.status === 'abnormal' ? group.hasAlert : !group.hasAlert)
      return matchesSearch && matchesStatus
    })
}

/**
 * ?i?u ph?i d? li?u v? hi?n th? m?n h?nh HealthMetrics.
 */
export default function HealthMetricsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useOutletContext()
  const { items, loading, error, refetch } = useResourceList('/health-metrics', {
    per_page: 50,
  })
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [patients, setPatients] = useState([])
  const [healthTypes, setHealthTypes] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [recordingOpen, setRecordingOpen] = useState(false)
  const [recordingPatientId, setRecordingPatientId] = useState('')
  const [filters, setFilters] = useState({
    search: '',
    date: todayValue(),
    status: '',
  })
  const [form, setForm] = useState(metricFormDefaults)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [activePrescriptions, setActivePrescriptions] = useState([])
  const [activePrescriptionLoading, setActivePrescriptionLoading] = useState(false)
  const [activePrescriptionError, setActivePrescriptionError] = useState('')

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    let active = true
    Promise.all([
      getList('/patients', { per_page: 100, scope: 'all' }),
      getList('/health-types', { per_page: 100 }),
    ])
      .then(([patientResult, typeResult]) => {
        if (!active) return
        setPatients(patientResult.items)
        setHealthTypes(typeResult.items)
      })
      .catch(() => {
        if (!active) return
        setPatients([])
        setHealthTypes([])
      })

    return () => {
      active = false
    }
  }, [])

  const groups = useMemo(
    () => patientGroupsFromData(patients, items, filters),
    [filters, items, patients],
  )
  const routePatientId = String(location.state?.patientId || '')
  const selectedGroup = groups.find((group) => group.id === (routePatientId || selectedGroupId)) || null
  const recordingGroup =
    groups.find((group) => group.id === recordingPatientId) ||
    groups.find((group) => group.id === String(form.patient_id)) ||
    null
  const alertGroups = selectedGroup ? [selectedGroup].filter((group) => group.hasAlert) : groups.filter((group) => group.hasAlert)
  const abnormalCount = groups.filter((group) => group.hasAlert).length
  const treatmentCount = groups.filter((group) => patientStatus(group.patient)).length
  const currentDoctorName = user?.full_name ? ` ${user.full_name}` : 'Bác sĩ'

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    const patientId = selectedGroup?.patientId
    if (!patientId) {
      setActivePrescriptions([])
      setActivePrescriptionError('')
      return undefined
    }

    let active = true
    setActivePrescriptionLoading(true)
    setActivePrescriptionError('')
    getList(`/health-metrics/patients/${patientId}/active-prescriptions`, { per_page: 20 })
      .then((result) => {
        if (active) setActivePrescriptions(result.items || [])
      })
      .catch((requestError) => {
        if (!active) return
        setActivePrescriptions([])
        setActivePrescriptionError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setActivePrescriptionLoading(false)
      })

    return () => {
      active = false
    }
  }, [selectedGroup?.patientId])

  function openDetail(group) {
    setSelectedGroupId(group.id)
    navigate('/health-metrics', {
      replace: true,
      state: {
        ...(location.state || {}),
        healthView: 'detail',
        patientId: group.id,
      },
    })
  }

  function openAlerts(group = selectedGroup) {
    navigate('/health-metrics', { replace: true, state: { healthView: 'alerts', patientId: group?.id || '' } })
  }

  function backToList() {
    setSelectedGroupId('')
    navigate('/health-metrics', { replace: true, state: null })
  }

  function backToScheduleDetail() {
    if (location.state?.returnTo) {
      navigate(location.state.returnTo, {
        state: {
          patientId: selectedGroup?.patientId,
          prescriptionId: location.state?.prescriptionId,
        },
      })
      return
    }

    const patientId = selectedGroup?.patientId || location.state?.patientId
    navigate(`/schedules${patientId ? `?patient_id=${patientId}` : ''}`, {
      state: {
        patientId,
        prescriptionId: location.state?.prescriptionId,
      },
    })
  }

  function viewPrescription(prescription) {
    navigate(`/prescriptions/${prescription.prescription_id}`, {
      state: {
        viewPrescriptionId: prescription.prescription_id,
        patientId: selectedGroup?.patientId,
        returnTo: location.pathname,
      },
    })
  }

  function openRecordForm(group = selectedGroup) {
    const patientId = group?.patientId || ''
    setRecordingOpen(true)
    setRecordingPatientId(patientId)
    setForm({ ...metricFormDefaults, patient_id: patientId, measure_date: todayValue() })
  }

  function closeRecordForm() {
    setRecordingOpen(false)
    setRecordingPatientId('')
    setForm(metricFormDefaults)
  }

  // Hàm submitMetrics gửi dữ liệu mới lên API hoặc component cha.
  async function submitMetrics(event) {
    event.preventDefault()
    const patientId = form.patient_id || recordingGroup?.patientId
    if (!patientId) {
      setToast({ type: 'error', message: 'Vui lòng chọn bệnh nhân cần ghi nhận chỉ số.' })
      return
    }

    const entries = metricDefinitions
      .map((definition) => ({
        definition,
        value: String(form[definition.key] || '').trim(),
        type: findHealthType(healthTypes, definition.terms),
      }))
      .filter((entry) => entry.value)

    if (!entries.length) {
      setToast({ type: 'error', message: 'Vui lòng nhập ít nhất một chỉ số sức khỏe.' })
      return
    }

    const missingType = entries.find((entry) => !entry.type)
    if (missingType) {
      setToast({
        type: 'error',
        message: `Database chưa có loại chỉ số "${missingType.definition.label}". Vui lòng thêm trong bảng health_types trước.`,
      })
      return
    }

    setSaving(true)
    try {
      const measureTime = `${form.measure_date || todayValue()} ${new Date().toTimeString().slice(0, 8)}`
      await Promise.all(
        entries.map((entry) =>
          createOne('/health-metrics', {
            patient_id: patientId,
            health_type_id: entry.type.health_type_id,
            measure_time: measureTime,
            value: entry.value,
            note: form.note || null,
          }),
        ),
      )
      setToast({ type: 'success', message: 'Đã ghi nhận chỉ số sức khỏe.' })
      closeRecordForm()
      setSelectedGroupId(String(patientId))
      refetch()
    } catch (requestError) {
      setToast({ type: 'error', message: getErrorMessage(requestError) })
    } finally {
      setSaving(false)
    }
  }


  if (recordingOpen) {
    return (
      <main className="page health-workflow-page">
        <PageHeader title="Ghi nhận chỉ số sức khỏe" />
        <section className="panel health-workflow-card">
          {recordingGroup ? (
            <div className="health-record-patient">
              <span>Bệnh nhân</span>
              <strong>{patientCode(recordingGroup.patient)}</strong>
              <p>{patientLabel(recordingGroup.patient)}</p>
            </div>
          ) : (
            <Field label="Bệnh nhân" required>
              <PatientSearchBox
                patients={patients}
                value={form.patient_id}
                onSelect={(patient) =>
                  setForm((current) => ({ ...current, patient_id: patient ? patient.patient_id : '' }))
                }
                placeholder="Tên, SĐT hoặc mã bệnh nhân"
              />
            </Field>
          )}

          <form className="health-record-form" onSubmit={submitMetrics}>
            <Field label="Ngày ghi nhận" required>
              <input
                type="date"
                value={form.measure_date}
                max={todayValue()}
                onChange={(event) => setForm((current) => ({ ...current, measure_date: event.target.value }))}
                required
              />
            </Field>

            <div className="health-bp-row">
              <Field label="Huyết áp tâm thu" required>
                <input
                  type="number"
                  min="40"
                  max="260"
                  value={form.systolic}
                  placeholder="120"
                  onChange={(event) => setForm((current) => ({ ...current, systolic: event.target.value }))}
                />
              </Field>
              <Field label="Huyết áp tâm trương">
                <input
                  type="number"
                  min="30"
                  max="180"
                  value={form.diastolic}
                  placeholder="80"
                  onChange={(event) => setForm((current) => ({ ...current, diastolic: event.target.value }))}
                />
              </Field>
            </div>

            <div className="health-record-grid">
              <Field label="Nhịp tim">
                <input
                  type="number"
                  min="30"
                  max="220"
                  value={form.heart_rate}
                  placeholder="75"
                  onChange={(event) => setForm((current) => ({ ...current, heart_rate: event.target.value }))}
                />
              </Field>
              <Field label="SpO2">
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={form.spo2}
                  placeholder="98"
                  onChange={(event) => setForm((current) => ({ ...current, spo2: event.target.value }))}
                />
              </Field>
              <Field label="Cân nặng">
                <input
                  type="number"
                  min="1"
                  max="300"
                  step="0.1"
                  value={form.weight}
                  placeholder="65"
                  onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))}
                />
              </Field>
              <Field label="Chiều cao">
                <input
                  type="number"
                  min="30"
                  max="250"
                  step="0.1"
                  value={form.height}
                  placeholder="170"
                  onChange={(event) => setForm((current) => ({ ...current, height: event.target.value }))}
                />
              </Field>
            </div>

            <Field label="Ghi chú">
              <textarea
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Ghi chú theo dõi nếu có"
              />
            </Field>

            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={closeRecordForm}>
                Hủy
              </button>
              <button className="primary-button" disabled={saving}>
                <Save size={17} /> {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </section>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </main>
    )
  }

  if (location.state?.healthView === 'alerts') {
    return (
      <main className="mc-health-alert-page">
        <section className="mc-list-hero">
          <div>
            <h1>Cảnh báo sức khỏe</h1>
            <p>Ưu tiên xử lý các chỉ số vượt ngưỡng</p>
          </div>
          <button type="button" className="secondary-button" onClick={selectedGroup ? () => openDetail(selectedGroup) : backToList}>
            <ArrowLeft size={16} /> Theo dõi sức khỏe
          </button>
        </section>

        <section className="health-alert-grid">
          {alertGroups.length ? (
            alertGroups.map((group) => {
              const warnings = groupWarnings(group)
              const warning = warnings[0]
              return (
                <article className="health-alert-card" key={group.id}>
                  <div className="health-alert-card-head">
                    <div>
                      <h2>{patientLabel(group.patient)}</h2>
                      <p>{patientCode(group.patient)} • {group.patient.phone || EMPTY_TEXT}</p>
                    </div>
                    <span className="status-badge info">Cần xử lý</span>
                  </div>

                  <div className="health-alert-info-grid">
                    <div>
                      <span>Loại chỉ số</span>
                      <strong>{warning ? metricTypeName(warning.metric) : 'Chỉ số'}</strong>
                    </div>
                    <div>
                      <span>Giá trị đo</span>
                      <strong>{warning?.value || EMPTY_TEXT}</strong>
                    </div>
                    <div>
                      <span>Nội dung vượt ngưỡng</span>
                      <strong>{warning?.message || 'Cần theo dõi'}</strong>
                    </div>
                  </div>

                  <div className="health-alert-recommendation">
                    <strong>Khuyến nghị</strong>
                    <p>• Theo dõi sát bệnh nhân.</p>
                    <p>• Kiểm tra lại sau 30 phút.</p>
                    <p>• Xem xét điều chỉnh điều trị nếu cảnh báo lặp lại.</p>
                  </div>

                  <button type="button" className="primary-button" onClick={() => openDetail(group)}>
                    Xem hồ sơ theo dõi
                  </button>
                </article>
              )
            })
          ) : (
            <article className="health-alert-empty">
              <HeartPulse size={24} />
              <strong>Không có cảnh báo sức khỏe</strong>
              <p>Các chỉ số hiện tại đang nằm trong ngưỡng theo dõi.</p>
            </article>
          )}
        </section>
      </main>
    )
  }

  if (selectedGroup) {
    const warnings = groupWarnings(selectedGroup)
    const historyByDate = groupMetricsByDate(selectedGroup.metrics).slice(0, 6)

    return (
      <main className="mc-health-detail-page">
        <section className="mc-detail-hero">
          <div>
            <h1>Chi tiết theo dõi sức khỏe</h1>
            <p>{patientCode(selectedGroup.patient)} • {patientLabel(selectedGroup.patient)}</p>
          </div>
          <div className="mc-detail-actions">
            <button type="button" className="secondary-button" onClick={backToList}>
              <ArrowLeft size={16} /> Quay lại
            </button>
            <button type="button" className="secondary-button" onClick={backToScheduleDetail}>
              <CalendarClock size={16} /> Quay lại chi tiết lịch uống thuốc
            </button>
            <button type="button" className="danger-soft-button" onClick={() => openAlerts(selectedGroup)}>
              <AlertTriangle size={16} /> Xem cảnh báo
            </button>
            <button type="button" className="primary-button" onClick={() => openRecordForm(selectedGroup)}>
              <Plus size={17} /> Ghi nhận chỉ số
            </button>
          </div>
        </section>

        <ActivePrescriptionCard
          prescriptions={activePrescriptions}
          loading={activePrescriptionLoading}
          error={activePrescriptionError}
          onViewPrescription={viewPrescription}
        />

        {activePrescriptions.length ? (
          <section className="health-treatment-context-card">
            <HeartPulse size={20} />
            <p>
              {activePrescriptions.length === 1 ? (
                <>
                  Theo dõi các chỉ số sức khỏe của bệnh nhân trong đợt điều trị từ{' '}
                  <strong>{formatDate(activePrescriptions[0].start_date)}</strong> đến{' '}
                  <strong>{formatDate(activePrescriptions[0].end_date)}</strong>.
                </>
              ) : (
                <>
                  Theo dõi các chỉ số sức khỏe của bệnh nhân trong{' '}
                  <strong>{activePrescriptions.length}</strong> đơn thuốc đang áp dụng.
                </>
              )}
            </p>
          </section>
        ) : null}

        <section className="health-detail-card health-patient-card">
          <div className="health-card-title-row">
            <h2>Thông tin bệnh nhân</h2>
            <span>Bác sĩ phụ trách: {currentDoctorName}</span>
          </div>
          <div className="health-detail-info-grid">
            <div><span>Mã bệnh nhân</span><strong>{patientCode(selectedGroup.patient)}</strong></div>
            <div><span>Họ tên</span><strong>{patientLabel(selectedGroup.patient)}</strong></div>
            <div><span>Giới tính / Ngày sinh</span><strong>{formatGender(selectedGroup.patient.gender)} • {formatDate(selectedGroup.patient.date_of_birth)}</strong></div>
          </div>
        </section>

        <section className="health-detail-card">
          <div className="health-card-title-row">
            <h2>Chỉ số hiện tại</h2>
            <span>{formatDateTime(selectedGroup.latestMetric?.measure_time)}</span>
          </div>
          <div className="health-current-tile-grid">
            <article><span>Huyết áp</span><strong>{bloodPressureText(selectedGroup)}</strong><small>mmHg</small></article>
            <article><span>Nhịp tim</span><strong>{currentMetricText(selectedGroup, 'heart_rate').replace(' bpm', '')}</strong><small>bpm</small></article>
            <article><span>Nhiệt độ</span><strong>{currentMetricText(selectedGroup, 'temperature').replace(' °C', '')}</strong><small>°C</small></article>
            <article><span>SpO2</span><strong>{currentMetricText(selectedGroup, 'spo2').replace(' %', '')}</strong><small>%</small></article>
            <article><span>Đường huyết</span><strong>{currentMetricText(selectedGroup, 'blood_sugar')}</strong><small>mmol/L</small></article>
            <article><span>Cân nặng</span><strong>{currentMetricText(selectedGroup, 'weight').replace(' kg', '')}</strong><small>kg</small></article>
            <article><span>Chiều cao</span><strong>{currentMetricText(selectedGroup, 'height').replace(' cm', '')}</strong><small>cm</small></article>
            <article><span>BMI</span><strong>{bmiText(selectedGroup)}</strong></article>
          </div>

          <div className={`health-warning-banner ${warnings.length ? 'warning' : 'normal'}`}>
            {warnings.length ? `⚠ ${warnings[0].message}. Vui lòng kiểm tra lại sau 30 phút.` : '✓ Không có cảnh báo'}
          </div>
        </section>

        <section className="health-detail-card">
          <h2>Lịch sử theo dõi</h2>
          <div className="health-history-table">
            <div className="health-history-head">
              <span>Ngày</span>
              <span>Huyết áp</span>
              <span>Nhịp tim</span>
              <span>Nhiệt độ</span>
              <span>SpO2</span>
              <span>Ghi chú</span>
            </div>
            {historyByDate.length ? (
              historyByDate.map((day) => {
                const row = dateHistoryRow(day.metrics)
                const note = day.metrics.find((metric) => metric.note)?.note || ''
                return (
                  <div className="health-history-row-modern" key={day.date}>
                    <span>{formatDate(day.date)}</span>
                    <span>{row.bloodPressure}</span>
                    <span>{row.heartRate}</span>
                    <span>{row.temperature}</span>
                    <span>{row.spo2}</span>
                    <span>{note || 'Ổn định'}</span>
                  </div>
                )
              })
            ) : (
              <div className="dashboard-empty">Chưa có dữ liệu theo dõi sức khỏe.</div>
            )}
          </div>
        </section>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </main>
    )
  }

  return (
    <main className="mc-health-page">
      <section className="mc-list-hero">
        <div>
          <h1>Theo dõi sức khỏe bệnh nhân</h1>
          <p>Ghi nhận chỉ số và phát hiện bất thường</p>
        </div>
        <button type="button" className="primary-button" onClick={() => openRecordForm(null)}>
          <Plus size={17} /> Ghi nhận chỉ số
        </button>
      </section>

      <section className="health-filter-card">
        <label className="filter-field">
          <span>Tìm bệnh nhân</span>
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Mã hoặc họ tên"
          />
        </label>
        <label className="filter-field">
          <span>Ngày theo dõi</span>
          <input
            type="date"
            value={filters.date}
            onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
          />
        </label>
        <label className="filter-field">
          <span>Trạng thái</span>
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">Tất cả</option>
            <option value="normal">Ổn định</option>
            <option value="abnormal">Có cảnh báo</option>
          </select>
        </label>
        <button type="button" className="primary-button" onClick={() => setFilters((current) => ({ ...current }))}>
          Áp dụng
        </button>
      </section>

      <section className="health-stat-row">
        <article>
          <div><span>Tổng bệnh nhân</span><strong>{groups.length}</strong></div>
          <span className="health-stat-icon blue"><Users size={20} /></span>
        </article>
        <article>
          <div><span>Đang điều trị</span><strong>{treatmentCount}</strong></div>
          <span className="health-stat-icon blue">•</span>
        </article>
        <article>
          <div><span>Có cảnh báo</span><strong>{abnormalCount}</strong></div>
          <span className="health-stat-icon red">!</span>
        </article>
        <article>
          <div><span>Ổn định</span><strong>{Math.max(groups.length - abnormalCount, 0)}</strong></div>
          <span className="health-stat-icon green">✓</span>
        </article>
      </section>

      <section className="health-table-panel">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <p className="form-error">Không truy xuất được dữ liệu theo dõi sức khỏe: {error}</p>
        ) : (
          <div className="health-modern-table">
            <div className="health-modern-table-head">
              <span>STT</span>
              <span>Bệnh nhân</span>
              <span>Lần theo dõi gần nhất</span>
              <span>Huyết áp</span>
              <span>Nhịp tim</span>
              <span>SpO2</span>
              <span>Cảnh báo</span>
              <span>Thao tác</span>
            </div>
            {groups.length ? (
              groups.map((group, index) => (
                <div className="health-modern-table-row" key={group.id}>
                  <span>{index + 1}</span>
                  <strong>
                    {patientLabel(group.patient)}
                    <small>{patientCode(group.patient)}</small>
                  </strong>
                  <span>{formatDateTime(group.latestMetric?.measure_time) || firstMetricDate(group)}</span>
                  <span>{bloodPressureText(group)}</span>
                  <span>{currentMetricText(group, 'heart_rate')}</span>
                  <span>{currentMetricText(group, 'spo2')}</span>
                  <StatusBadge value={group.hasAlert ? groupWarningText(group).replace('⚠ ', '') : 'Ổn định'} />
                  <button
                    type="button"
                    className="secondary-button small-button"
                    onClick={() => openDetail(group)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              ))
            ) : (
              <div className="dashboard-empty">Chưa có dữ liệu phù hợp.</div>
            )}
          </div>
        )}
      </section>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
