/**
 * File thuộc nhóm pages, điều phối dữ liệu của từng màn hình trước khi truyền xuống component hiển thị.
 */

import { getPatient } from "../../api/patientApi";
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CheckCircle,
  Pill,
  Plus,
  TriangleAlert,
} from 'lucide-react'
import { getList } from '../../api/resources'
import { getErrorMessage } from '../../api/client'
import LoadingState from '../../components/ui/LoadingState'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import Toast from '../../components/ui/Toast'
import PatientMedicalRecordsView from '../../components/medical-records/PatientMedicalRecordsView'
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


const ACTIVE_RECORD_MESSAGE ='Bệnh nhân đang có hồ sơ điều trị. Không thể tạo hồ sơ mới.'
  
const ACTIVE_RECORD_MESSAGE =
  'Bệnh nhân đang có một hồ sơ điều trị. Vui lòng hoàn thành điều trị trước khi tạo hồ sơ bệnh án mới.'


/**
 * Hiển thị component InfoItem trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.label Giá trị label được dùng để render hoặc xử lý tương tác.
 * @param {*} props.value Giá trị value được dùng để render hoặc xử lý tương tác.
 */
function InfoItem({ label, value }) {
  return (
    <div className="patient-profile-item">
      <span>{label}</span>
      <strong>{value || EMPTY_TEXT}</strong>
    </div>
  )
}
/**
 * Hiển thị component Section trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.title Giá trị title được dùng để render hoặc xử lý tương tác.
 * @param {*} props.children Giá trị children được dùng để render hoặc xử lý tương tác.
 * @param {*} props.actions Giá trị actions được dùng để render hoặc xử lý tương tác.
 */
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

/**
 * Hiển thị hộp thoại HealthMetric theo state truyền vào.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.metric Giá trị metric được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onClose Giá trị onClose được dùng để render hoặc xử lý tương tác.
 */
function HealthMetricDialog({ metric, onClose }) {
  if (!metric) return null

  return (
    <div className="dialog-backdrop">
      <section className="dialog patient-info-dialog" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <div>

            <span>Chi tiáº¿t chá»‰ sá»‘ sá»©c khá»e</span>

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

/**
 * ?i?u ph?i d? li?u v? hi?n th? m?n h?nh PatientDetail.
 */
export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
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

    // Hàm fetchPatient nạp dữ liệu từ API hoặc nguồn dữ liệu hiện có để cập nhật giao diện.
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


  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
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
  const healthMetrics = useMemo(() => patient?.health_metrics || [], [patient])
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
//4 t
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

  // Hàm createMedicalRecord gửi dữ liệu mới lên API hoặc component cha.
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
    navigate('/prescriptions/create', {
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
          <h1>Chi tiết bệnh nhân</h1>
          <p>{formatPatientCode(patient)} • Cập nhật {formatDate(patient.updated_at || patient.created_at)}</p>
        </div>
        <div className="mc-detail-actions">
          <button className="mc-dark-button" onClick={createMedicalRecord}>
            <Plus size={16} /> Tạo hồ sơ mới
          </button>
          <button className="primary-button" onClick={prescribe}>
            <Pill size={16} /> Kê toa thuốc
          </button>
        </div>
      </section>

      <section className="mc-patient-detail-layout">
        <aside className="mc-patient-profile-card">
          <div className="mc-patient-avatar">{initials(patient.full_name)}</div>
          <h2>{patient.full_name}</h2>
          <StatusBadge value={currentStatus} />
          <div className="mc-patient-side-info">
            <InfoItem label="Mã bệnh nhân" value={formatPatientCode(patient)} />
            <InfoItem label="Số điện thoại" value={patient.phone} />
          </div>
        </aside>

        <div className="mc-patient-detail-main">
          <nav className="patient-detail-nav mc-patient-tabs" aria-label="Thông tin bệnh nhân">
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
                <InfoItem label="Họ tên" value={patient.full_name} />
                <InfoItem label="Giới tính" value={formatGender(patient.gender)} />
                <InfoItem label="Ngày sinh" value={formatDate(patient.date_of_birth)} />
                <InfoItem label="Số điện thoại" value={patient.phone} />
                <InfoItem label="Địa chỉ" value={patient.address} />
                <InfoItem label="Trạng thái điều trị" value={currentStatus} />
                <InfoItem label="Bệnh nền" value={patientChronicDiseaseText(patient)} />
                <InfoItem label="Dị ứng thuốc" value={patientAllergyText(patient)} />

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

                        <th>Mã đơn</th>
                        <th>Ngày kê</th>
                        <th>Trạng thái</th>
                        <th>Số thuốc</th>

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
                                navigate(`/prescriptions/${prescription.prescription_id}`, {
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
                <EmptyState title="Chưa có toa thuốc" />
              )}
            </Section>
          )}

          {activeSection === 'schedules' && (
            <Section title="Lịch uống thuốc">
              {schedules.length ? (
                <div className="patient-detail-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Thuốc</th>
                        <th>Buổi uống</th>
                        <th>Tần suất</th>
                        <th>Bữa ăn</th>
                        <th>Thời gian</th>
                        <th>Trạng thái nhắc</th>
                        <th>Thao tác</th>
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
                <EmptyState title="Chưa có lịch uống thuốc" />
              )}
            </Section>
          )}

          {activeSection === 'health' && (
            <Section title="Thông tin sức khỏe">
              <div className="patient-health-alert-card">
                <div className="patient-health-alert-heading">
                  <h3>Cảnh báo sức khỏe</h3>
                </div>
                <div className="patient-health-alert-patient">
                  <span>Bệnh nhân:</span>
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
                            <small>{isWarning ? `⚠ ${evaluation.message}` : `✓ ${evaluation.message}`}</small>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState title="Chưa có dữ liệu cảnh báo sức khỏe" />
                )}
              </div>

              {healthMetrics.length ? (
                <div className="patient-detail-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Loại chỉ số</th>
                        <th>Giá trị</th>
                        <th>Thời gian đo</th>
                        <th>Ghi chú</th>
                        <th>Thao tác</th>
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
            <Section title="Hồ sơ bệnh án">
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
