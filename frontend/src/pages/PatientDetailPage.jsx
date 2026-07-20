import { getPatient } from "../api/patientApi";
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CheckCircle,
  Pill,
  Plus,
  TriangleAlert,
} from 'lucide-react'
import { getList, getOne } from '../api/resources'
import { getErrorMessage } from '../api/client'
import LoadingState from '../components/ui/LoadingState'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'
import Toast from '../components/ui/Toast'
import PatientMedicalRecordsView from '../components/medical-records/PatientMedicalRecordsView'
import {
  EMPTY_TEXT,
  formatDate,
  formatDateTime,
  formatGender,
  formatPatientCode,
  isMedicalRecordInTreatmentStatus,
  statusAfterEndDate,
} from '../utils/formatters'
import {
  getPrescriptionStartDate,
  getScheduleSessionsFromTimes,
} from '../utils/prescriptions'
import {
  groupReminderLogsBySchedule,
  reminderStatusForSchedule,
  todayApiDate,
} from '../utils/medicationReminders'

const ACTIVE_RECORD_MESSAGE ='Bệnh nhân đang có hồ sơ điều trị. Không thể tạo hồ sơ mới.'
  

function InfoItem({ label, value }) {
    return (
        <div className="info-item">
            <span className="info-label">
                {label}
            </span>

            <strong className="info-value">
                {value || EMPTY_TEXT}
            </strong>
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

function formatRecordCode(record) {
  return record?.record_code || `HS-${String(record?.record_id || '').padStart(3, '0')}`
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

function recordDiagnosis(record) {
  return record?.diagnosis_info?.diagnosis_name || record?.diagnosis || EMPTY_TEXT
}

function recordSymptoms(record) {
  const relationSymptoms = (record?.symptom_details || [])
    .map((symptom) => symptom?.description)
    .filter(Boolean)

  if (relationSymptoms.length) {
    return [...new Set(relationSymptoms)].join(', ')
  }

  return record?.symptoms || EMPTY_TEXT
}

function normalizeMetricText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function metricTypeName(metric) {
  return metric?.health_type?.health_type_name || 'Chá»‰ sá»‘ sá»©c khá»e'
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

  if (metricHasOpenAlert(metric)) return { status: 'warning', message: 'CÃ³ cáº£nh bÃ¡o sá»©c khá»e Ä‘ang má»Ÿ' }

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
    if (firstValue >= 39) return { status: 'warning', message: 'Sá»‘t cao' }
    if (firstValue >= 37.5) return { status: 'warning', message: 'Cao hÆ¡n ngÆ°á»¡ng bÃ¬nh thÆ°á»ng' }
  }

  if ((name.includes('spo2') || name.includes('oxy')) && Number.isFinite(firstValue) && firstValue < 95) {
    return { status: 'warning', message: 'Tháº¥p hÆ¡n ngÆ°á»¡ng bÃ¬nh thÆ°á»ng' }
  }

  if (Number.isFinite(firstValue)) {
    if (hasMin && firstValue < min) return { status: 'warning', message: 'Tháº¥p hÆ¡n ngÆ°á»¡ng bÃ¬nh thÆ°á»ng' }
    if (hasMax && firstValue > max) return { status: 'warning', message: 'Cao hÆ¡n ngÆ°á»¡ng bÃ¬nh thÆ°á»ng' }
  }

  return { status: 'normal', message: 'BÃ¬nh thÆ°á»ng' }
}

function HealthMetricDialog({ metric, onClose }) {
  if (!metric) return null

  return (
    <div className="dialog-backdrop">
      <section className="dialog patient-info-dialog" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <div>
            <span>Chi tiáº¿t chá»‰ sá»‘ sá»©c khá»e</span>
            <h2>{metric.health_type?.health_type_name || 'Chỉ số sức khỏe'}</h2>
          </div>
          <button className="icon-button" title="ÄÃ³ng" onClick={onClose}>
            Ã—
          </button>
        </div>
        <div className="patient-info-detail-grid">
          <InfoItem label="Loáº¡i chá»‰ sá»‘" value={metric.health_type?.health_type_name} />
          <InfoItem label="GiÃ¡ trá»‹" value={metric.value} />
          <InfoItem label="ÄÆ¡n vá»‹" value={metric.health_type?.unit} />
          <InfoItem label="Thá»i gian Ä‘o" value={formatDateTime(metric.measure_time)} />
          <InfoItem label="Ghi chÃº" value={metric.note} />
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

  //xem chi tiết bệnh nhân
  useEffect(() => {
    let active = true;

    async function fetchPatient() {
        try {
            setLoading(true);
            setError("");

           const patient = await getPatient(id);

console.log("Patient:", patient);

if (active) {
    setPatient(patient);
}
        } catch (error) {
            if (active) {
                setError(getErrorMessage(error));
            }
        } finally {
            if (active) {
                setLoading(false);
            }
        }
    }

    fetchPatient();

    return () => {
        active = false;
    };
}, [id]);


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
  const healthMetrics = patient?.health_metrics || []
  const latestHealthMetrics = useMemo(() => latestMetricsByType(healthMetrics), [healthMetrics])
  const activeTreatmentRecord = useMemo(
    () => records.find((record) => isMedicalRecordInTreatmentStatus(record.status)),
    [records],
  )
  const prescribableRecord = useMemo(
    () => records.find((record) => record.can_prescribe),
    [records],
  )
  const currentStatus = activeTreatmentRecord ? 'Äang Ä‘iá»u trá»‹' : records.length ? 'HoÃ n thÃ nh Ä‘iá»u trá»‹' : 'Theo dÃµi Ä‘á»‹nh ká»³'
//4 tab
  const detailTabs = [
    { key: 'personal', label: 'Thông tin cá nhân' },
    { key: 'prescriptions', label: 'Toa thuốc' },
    { key: 'schedules', label: 'Lịch uống thuốc' },
    { key: 'health', label: 'Thông tin sức khỏe' },
    { key: 'records', label: 'Hồ sơ bệnh án' },
    
  ]

  if (loading) return <LoadingState label="Äang táº£i chi tiáº¿t bá»‡nh nhÃ¢n..." />
  if (error) return <EmptyState title="KhÃ´ng táº£i Ä‘Æ°á»£c bá»‡nh nhÃ¢n" description={error} />
  if (!patient) return <EmptyState title="KhÃ´ng tÃ¬m tháº¥y bá»‡nh nhÃ¢n" />

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
        message: 'Bá»‡nh nhÃ¢n Ä‘Ã£ hoÃ n thÃ nh Ä‘iá»u trá»‹. Vui lÃ²ng táº¡o há»“ sÆ¡ bá»‡nh Ã¡n má»›i trÆ°á»›c khi kÃª toa.',
      })
      return
    }
    if (!prescribableRecord) {
      setToast({ type: 'error', message: 'Bá»‡nh nhÃ¢n cáº§n cÃ³ há»“ sÆ¡ bá»‡nh Ã¡n trÆ°á»›c khi kÃª toa.' })
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
    <main className="page mc-patient-detail-page">
      <section className="mc-detail-hero">
        <div>
          <h1>Chi tiáº¿t bá»‡nh nhÃ¢n</h1>
          <p>{formatPatientCode(patient)} â€¢ Cáº­p nháº­t {formatDate(patient.updated_at || patient.created_at)}</p>
        </div>
        <div className="mc-detail-actions">
          <button className="mc-dark-button" onClick={createMedicalRecord}>
            <Plus size={16} /> Táº¡o há»“ sÆ¡ má»›i
          </button>
          <button className="primary-button" onClick={prescribe}>
            <Pill size={16} /> KÃª toa thuá»‘c
          </button>
        </div>
      </section>

      <section className="mc-patient-detail-layout">
        <aside className="mc-patient-profile-card">
          <div className="mc-patient-avatar">{initials(patient.full_name)}</div>
          <h2>{patient.full_name}</h2>
          <StatusBadge value={currentStatus} />
          <div className="mc-patient-side-info">
            <InfoItem label="MÃ£ bá»‡nh nhÃ¢n" value={formatPatientCode(patient)} />
            <InfoItem label="Sá»‘ Ä‘iá»‡n thoáº¡i" value={patient.phone} />
          </div>
        </aside>

        <div className="mc-patient-detail-main">
          <nav className="patient-detail-nav mc-patient-tabs" aria-label="ThÃ´ng tin bá»‡nh nhÃ¢n">
            {detailTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeSection === tab.key ? 'active' : ''}
                onClick={() => setActiveSection(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeSection === 'personal' && (
            <Section title="Thông tin cá nhân">
              <div className="patient-profile-grid">
                <InfoItem label="Họ Tên" value={patient.full_name} />
                <InfoItem label="Giới tính" value={formatGender(patient.gender)} />
                <InfoItem label="Ngày Sinh" value={formatDate(patient.date_of_birth)} />
                <InfoItem label="Số điện thoại" value={patient.phone} />
                <InfoItem label="Địa chỉ" value={patient.address} />
                <InfoItem label="Trạng Thái" value={currentStatus} />
                <InfoItem label="Bệnh nền " value={patientChronicDiseaseText(patient)} />
                <InfoItem label="Dị ứng" value={patientAllergyText(patient)} />
              </div>
            </Section>
          )}

          {activeSection === 'prescriptions' && (
            <Section title="Toa thuốc">
              {prescriptions.length ? (
                <div className="patient-detail-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Mã toa</th>
                        <th>Ngày khám</th>
                        <th>Trạng thái</th>
                        <th>Sá»‘ </th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map((prescription) => (
                        <tr key={prescription.prescription_id}>
                          <td>{formatPrescriptionCode(prescription)}</td>
                          <td>{formatDate(getPrescriptionStartDate(prescription))}</td>
                          <td><StatusBadge value={statusAfterEndDate(prescription)} /></td>
                          <td>{prescription.details?.length || 0}</td>
                          <td>
                            <button
                              type="button"
                              className="mc-small-text-button"
                              onClick={() =>
                                navigate('/prescriptions', {
                                  state: { viewPrescriptionId: prescription.prescription_id },
                                })
                              }
                            >
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="ChÆ°a cÃ³ toa thuá»‘c" />
              )}
            </Section>
          )}

          {activeSection === 'schedules' && (
            <Section title="Lá»‹ch uá»‘ng thuá»‘c">
              {schedules.length ? (
                <div className="patient-detail-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Thuá»‘c</th>
                        <th>Buá»•i uá»‘ng</th>
                        <th>Táº§n suáº¥t</th>
                        <th>Bá»¯a Äƒn</th>
                        <th>Thá»i gian</th>
                        <th>Tráº¡ng thÃ¡i nháº¯c</th>
                        <th>Thao tÃ¡c</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map((schedule) => (
                        <tr key={schedule.schedule_id}>
                          <td>{schedule.detail?.medicine?.medicine_name || EMPTY_TEXT}</td>
                          <td>{getScheduleSessionsFromTimes(schedule.times || []).join(', ') || EMPTY_TEXT}</td>
                          <td>
                            {schedule.detail?.frequency_type?.type_name ||
                              schedule.detail?.frequency_type?.frequency_name ||
                              EMPTY_TEXT}
                          </td>
                          <td>{schedule.detail?.meal_time?.meal_time_name || EMPTY_TEXT}</td>
                          <td>{formatDate(schedule.start_date)} - {formatDate(schedule.end_date)}</td>
                          <td><StatusBadge value={reminderStatusForSchedule(schedule, reminderLogsBySchedule)} /></td>
                          <td>
                            <button
                              type="button"
                              className="mc-small-text-button"
                              onClick={() => navigate(`/schedules/${schedule.schedule_id}`)}
                            >
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="ChÆ°a cÃ³ lá»‹ch uá»‘ng thuá»‘c" />
              )}
            </Section>
          )}

          {activeSection === 'health' && (
            <Section title="ThÃ´ng tin sá»©c khá»e">
              <div className="patient-health-alert-card">
                <div className="patient-health-alert-heading">
                  <h3>Cáº£nh bÃ¡o sá»©c khá»e</h3>
                </div>
                <div className="patient-health-alert-patient">
                  <span>Bá»‡nh nhÃ¢n:</span>
                  <strong>{patient.full_name || EMPTY_TEXT}</strong>
                </div>
                {latestHealthMetrics.length ? (
                  <div className="patient-health-alert-list">
                    {latestHealthMetrics.map((metric) => {
                      const evaluation = evaluateHealthMetric(metric)
                      const isWarning = evaluation.status === 'warning'
                      const Icon = isWarning ? TriangleAlert : CheckCircle
                      return (
                        <article
                          className={`patient-health-alert-item ${isWarning ? 'warning' : 'normal'}`}
                          key={metric.health_metric_id || `${metric.health_type_id}-${metric.measure_time}`}
                        >
                          <Icon size={18} />
                          <div>
                            <strong>{metricTypeName(metric)}</strong>
                            <span>{metricValueText(metric)}</span>
                            <small>{isWarning ? `âš  ${evaluation.message}` : `âœ“ ${evaluation.message}`}</small>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState title="ChÆ°a cÃ³ dá»¯ liá»‡u cáº£nh bÃ¡o sá»©c khá»e" />
                )}
              </div>

              {healthMetrics.length ? (
                <div className="patient-detail-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Loáº¡i chá»‰ sá»‘</th>
                        <th>GiÃ¡ trá»‹</th>
                        <th>Thá»i gian Ä‘o</th>
                        <th>Ghi chÃº</th>
                        <th>Thao tÃ¡c</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthMetrics.map((metric) => (
                        <tr key={metric.health_metric_id}>
                          <td>{metric.health_type?.health_type_name || EMPTY_TEXT}</td>
                          <td>{metricValueText(metric)}</td>
                          <td>{formatDateTime(metric.measure_time)}</td>
                          <td>{metric.note || EMPTY_TEXT}</td>
                          <td>
                            <button className="mc-small-text-button" onClick={() => setViewingHealthMetric(metric)}>
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </Section>
          )}

          {activeSection === 'records' && (
            <Section title="Há»“ sÆ¡ bá»‡nh Ã¡n">
              <PatientMedicalRecordsView
                records={records}
                loading={false}
                onView={(record) => navigate(`/medical-records/${record.record_id}`)}
              />
            </Section>
          )}
        </div>
      </section>

      <HealthMetricDialog metric={viewingHealthMetric} onClose={() => setViewingHealthMetric(null)} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
