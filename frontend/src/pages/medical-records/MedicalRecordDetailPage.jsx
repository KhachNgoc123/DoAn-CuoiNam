/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, FileSpreadsheet, Pencil, Pill, Printer } from 'lucide-react'
import { getList, getOne, updateOne } from '../../services/resourceService'
import { getErrorMessage } from '../../services/api'
import LoadingState from '../../components/common/Loading/Loading'
import EmptyState from '../../components/common/EmptyState/EmptyState'
import MedicalRecordForm from '../../components/medical-records/MedicalRecordForm'
import Toast from '../../components/common/Toast/Toast'
import StatusBadge from '../../components/common/StatusBadge/StatusBadge'
import {
  EMPTY_TEXT,
  formatDate,
  formatGender,
  formatPatientCode,
  statusAfterEndDate,
} from '../../utils/formatters'
import { downloadStyledExcel } from '../../utils/excelExport'

function formatRecordCode(record) {
  return record?.record_code || `HS-${String(record?.record_id || '').padStart(3, '0')}`
}

function formatPrescriptionCode(prescription) {
  return prescription?.prescription_code || `DT${String(prescription?.prescription_id || '').padStart(3, '0')}`
}

function splitTextList(value) {
  return String(value || '')
    .split(/[,;|\n]+/u)
    .map((item) => item.trim())
    .filter(Boolean)
}

function displayText(value) {
  return value === null || value === undefined || value === '' ? EMPTY_TEXT : value
}

function InfoItem({ label, value, className = '' }) {
  return (
    <div className={`record-info-tile ${className}`}>
      <span>{label}</span>
      <strong>{displayText(value)}</strong>
    </div>
  )
}

function chronicDiseaseRows(patient = {}) {
  const relationRows = Array.isArray(patient.chronic_diseases)
    ? patient.chronic_diseases.map((item, index) => ({
        id: item.patient_chronic_disease_id || item.chronic_disease_id || `chronic-${index}`,
        disease_name: item.disease_name || item.name,
        duration: item.duration || item.diagnosed_at || item.created_at,
        status: item.status || 'Đang theo dõi',
      }))
    : []

  const textRows = splitTextList(patient.underlying_disease).map((name, index) => ({
    id: `underlying-${index}`,
    disease_name: name,
    duration: '',
    status: 'Đang theo dõi',
  }))

  const seen = new Set()
  return [...relationRows, ...textRows].filter((item) => {
    const key = String(item.disease_name || '').toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function allergyRows(patient = {}, record = {}) {
  const relationRows = Array.isArray(patient.allergies)
    ? patient.allergies.map((item, index) => ({
        id: item.patient_allergy_id || item.allergy_id || `allergy-${index}`,
        medicine_name: item.allergy_name || item.medicine_name || item.name,
        reaction: item.reaction || item.symptom || item.description,
        severity: item.severity || item.level || 'Cần kiểm tra',
        source: item.source || 'Người bệnh cung cấp',
      }))
    : []

  const textRows = splitTextList([patient.allergy, record.allergy].filter(Boolean).join(', ')).map(
    (name, index) => ({
      id: `allergy-text-${index}`,
      medicine_name: name,
      reaction: '',
      severity: 'Cần kiểm tra',
      source: 'Bác sĩ ghi nhận',
    }),
  )

  const seen = new Set()
  return [...relationRows, ...textRows].filter((item) => {
    const key = String(item.medicine_name || '').toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function latestPrescriptionRows(prescriptions = []) {
  return [...prescriptions]
    .sort((left, right) => String(right.start_date || '').localeCompare(String(left.start_date || '')))
    .slice(0, 2)
}

function prescriptionMedicineText(prescription) {
  return (
    prescription.details
      ?.map((detail) => {
        const name = detail.medicine?.medicine_name || detail.medicine_name
        const dosage = detail.dosage
        const frequency =
          detail.frequency_type?.frequency_name ||
          detail.frequencyType?.frequency_name ||
          detail.frequency_type?.type_name
        return [name, dosage, frequency].filter(Boolean).join(' — ')
      })
      .filter(Boolean)
      .join('\n') || EMPTY_TEXT
  )
}

function collectSchedules(prescriptions = []) {
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

function metricName(metric) {
  return metric?.health_type?.health_type_name || metric?.healthType?.health_type_name || ''
}

function metricUnit(metric) {
  return metric?.health_type?.unit || metric?.healthType?.unit || ''
}

function metricValue(metric) {
  if (!metric) return EMPTY_TEXT
  return `${metric.value ?? metric.metric_value ?? EMPTY_TEXT}${metricUnit(metric) ? metricUnit(metric) : ''}`
}

function latestMetricMap(record) {
  const metrics = [...(record.visit_metrics || []), ...(record.latest_health_metrics || [])]
  const map = new Map()
  metrics.forEach((metric) => {
    const key = String(metricName(metric)).toLowerCase()
    if (!map.has(key)) map.set(key, metric)
  })
  return map
}

function findMetric(metrics, keywords) {
  return Array.from(metrics.entries()).find(([name]) =>
    keywords.some((keyword) => name.includes(keyword)),
  )?.[1]
}

export default function MedicalRecordDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [visitHistory, setVisitHistory] = useState([])

  function load() {
    setLoading(true)
    getOne('/medical-records', id)
      .then(setRecord)
      .catch(() => setRecord(null))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  useEffect(() => {
    const patientId = record?.patient_id || record?.patient?.patient_id
    if (!patientId) {
      setVisitHistory([])
      return undefined
    }

    let active = true
    getList('/medical-records', { patient_id: patientId, per_page: 20 })
      .then((result) => {
        if (!active) return
        const currentRecordId = String(record.record_id || record.id || id)
        const historyRows = (result.items || [])
          .filter((item) => String(item.record_id || item.id) !== currentRecordId)
          .sort((left, right) => {
            const leftDate = new Date(left.visit_date || left.created_at || 0).getTime()
            const rightDate = new Date(right.visit_date || right.created_at || 0).getTime()
            return rightDate - leftDate
          })
        setVisitHistory(historyRows)
      })
      .catch(() => {
        if (active) setVisitHistory([])
      })

    return () => {
      active = false
    }
  }, [id, record])

  async function save(payload) {
    setSaving(true)
    try {
      setRecord(await updateOne('/medical-records', id, payload))
      setEditing(false)
      setToast({ type: 'success', message: 'Đã cập nhật hồ sơ bệnh án.' })
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const patient = useMemo(() => record?.patient || {}, [record])
  const chronicRows = useMemo(() => chronicDiseaseRows(patient), [patient])
  const allergyHistoryRows = useMemo(() => allergyRows(patient, record || {}), [patient, record])
  const prescriptions = latestPrescriptionRows(record?.prescriptions || [])
  const schedules = collectSchedules(record?.prescriptions || [])
  const metricMap = record ? latestMetricMap(record) : new Map()
  const bloodPressure = findMetric(metricMap, ['huyết áp', 'huyet ap', 'blood pressure'])
  const weight = findMetric(metricMap, ['cân nặng', 'can nang', 'weight'])
  const spo2 = findMetric(metricMap, ['spo2', 'sp o2', 'oxy'])

  function exportRecordExcel() {
    downloadStyledExcel(`${formatRecordCode(record)}.xls`, {
      title: 'Chi tiết hồ sơ bệnh án',
      rows: [
        ['Chi tiết hồ sơ bệnh án'],
        ['Mã hồ sơ', formatRecordCode(record)],
        ['Ngày khám', formatDate(record.visit_date)],
        ['Bệnh nhân', patient.full_name || ''],
        ['Bác sĩ phụ trách', record.doctor?.full_name || ''],
        ['Triệu chứng', record.symptoms || record.chief_complaint || ''],
        ['Chẩn đoán', record.diagnosis || ''],
        ['Ghi chú bác sĩ', record.doctor_note || ''],
        ['Trạng thái', record.status || ''],
        [],
        ['Đơn thuốc liên quan'],
        ['Mã toa', 'Ngày bắt đầu', 'Ngày kết thúc', 'Trạng thái', 'Thuốc'],
        ...(record.prescriptions || []).map((prescription) => [
          formatPrescriptionCode(prescription),
          formatDate(prescription.start_date),
          formatDate(prescription.end_date),
          statusAfterEndDate(prescription),
          prescriptionMedicineText(prescription),
        ]),
      ],
    })
  }

  if (loading) {
    return (
      <main className="page">
        <LoadingState />
      </main>
    )
  }

  if (!record) {
    return (
      <main className="page">
        <EmptyState title="Không tìm thấy hồ sơ hoặc bạn không có quyền xem" />
      </main>
    )
  }

  if (editing) {
    return (
      <main className="page medical-record-entry-page">
        <section className="mc-list-hero">
          <div>
            <h1>Cập nhật hồ sơ bệnh án</h1>
            <p>{formatRecordCode(record)} • Ngày khám {formatDate(record.visit_date)}</p>
          </div>
        </section>
        <section className="medical-record-entry-surface">
          <MedicalRecordForm
            initialValue={record}
            patients={[patient]}
            loading={saving}
            onSubmit={save}
            onCancel={() => setEditing(false)}
          />
        </section>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </main>
    )
  }

  return (
    <main className="page mc-record-detail-page">
      <section className="mc-detail-hero">
        <div>
          <h1>Chi tiết hồ sơ bệnh án</h1>
          <p>{formatRecordCode(record)} • Ngày khám {formatDate(record.visit_date)}</p>
        </div>
        <div className="mc-detail-actions">
          <button className="secondary-button" onClick={() => navigate('/medical-records')}>
            <ArrowLeft size={16} /> Quay lại
          </button>
          {record.can_edit !== false && (
            <button className="mc-warning-button" onClick={() => setEditing(true)}>
              <Pencil size={16} /> Cập nhật hồ sơ
            </button>
          )}
          {record.can_prescribe && (
            <button
              className="primary-button"
              onClick={() => navigate('/prescriptions', { state: { mode: 'create', recordId: record.record_id } })}
            >
              <Pill size={16} /> Kê toa thuốc
            </button>
          )}
          <button className="secondary-button" onClick={exportRecordExcel}>
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button className="secondary-button" onClick={() => window.print()}>
            <Printer size={16} /> In hồ sơ
          </button>
          <button
            className="mc-dark-button"
            onClick={() => {
              const patientId = patient?.patient_id || record.patient_id
              navigate(`/schedules${patientId ? `?patient_id=${patientId}` : ''}`, {
                state: { patientId },
              })
            }}
          >
            <CalendarClock size={16} /> Tạo lịch uống
          </button>
        </div>
      </section>

      <section className="mc-record-detail-grid">
        <article className="mc-record-card">
          <h2>Thông tin bệnh nhân</h2>
          <div className="record-info-grid compact">
            <InfoItem label="Mã bệnh nhân" value={formatPatientCode(patient || { patient_id: record.patient_id })} />
            <InfoItem label="Họ tên" value={patient.full_name} />
            <InfoItem label="Giới tính" value={formatGender(patient.gender)} />
            <InfoItem label="Ngày sinh" value={formatDate(patient.date_of_birth)} />
            <InfoItem label="Số điện thoại" value={patient.phone} className="wide" />
            <InfoItem label="Địa chỉ" value={patient.address} className="wide" />
          </div>
        </article>

        <article className="mc-record-card">
          <div className="mc-record-title-row">
            <h2>Thông tin hồ sơ</h2>
            <StatusBadge value={record.status} />
          </div>
          <div className="record-info-grid">
            <InfoItem label="Mã hồ sơ" value={formatRecordCode(record)} />
            <InfoItem label="Ngày khám" value={formatDate(record.visit_date)} />
            <InfoItem label="Triệu chứng" value={record.symptoms || record.chief_complaint} />
            <InfoItem label="Chẩn đoán" value={record.diagnosis} />
            <InfoItem label="Ghi chú bác sĩ" value={record.doctor_note} />
          </div>
        </article>

        <article className="mc-record-card">
          <h2>Bệnh nền / tiền sử</h2>
          {chronicRows.length ? (
            <div className="mc-record-stack">
              {chronicRows.map((item) => (
                <div className="record-info-tile" key={item.id}>
                  <span>Tên bệnh</span>
                  <strong>{item.disease_name}</strong>
                  {(item.duration || item.status) && <small>{[item.duration, item.status].filter(Boolean).join(' • ')}</small>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa ghi nhận bệnh nền" />
          )}
        </article>

        <article className="mc-record-card">
          <h2>Dị ứng thuốc</h2>
          {allergyHistoryRows.length ? (
            <div className="mc-record-stack">
              {allergyHistoryRows.map((item) => (
                <div className="mc-allergy-box" key={item.id}>
                  <strong>{item.medicine_name}</strong>
                  <span>{[item.reaction, `Mức độ: ${item.severity}`].filter(Boolean).join(' • ')}</span>
                  <small>Nguồn: {item.source || 'Người bệnh cung cấp'}</small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa ghi nhận dị ứng thuốc" />
          )}
        </article>

        <article className="mc-record-card">
          <h2>Theo dõi sức khỏe</h2>
          <div className="mc-health-mini-grid">
            <div>
              <span>Huyết áp</span>
              <strong>{metricValue(bloodPressure)}</strong>
            </div>
            <div>
              <span>Cân nặng</span>
              <strong>{metricValue(weight)}</strong>
            </div>
            <div>
              <span>SpO2</span>
              <strong>{metricValue(spo2)}</strong>
            </div>
          </div>
          {bloodPressure && (
            <div className="mc-record-warning">⚠ Huyết áp cao — vượt ngưỡng theo dõi</div>
          )}
        </article>

        <article className="mc-record-card mc-record-related-card">
          <h2>L?ch s? toa thu?c</h2>
          {prescriptions.length ? (
            <div className="mc-record-stack">
              {prescriptions.map((prescription) => (
                <div className="mc-prescription-summary" key={prescription.prescription_id}>
                  <strong>{formatPrescriptionCode(prescription)} • {formatDate(prescription.start_date)}</strong>
                  <StatusBadge value={statusAfterEndDate(prescription)} />
                  <p>{prescriptionMedicineText(prescription)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có toa thuốc" />
          )}
          {schedules.length ? (
            <small className="mc-related-note">{schedules.length} lịch uống thuốc đã được tạo từ hồ sơ này.</small>
          ) : null}
        </article>

        <article className="mc-record-card mc-visit-history-card">
          <h2>L?ch s? di?u tr?</h2>
          {visitHistory.length ? (
            <div className="mc-visit-history-list">
              {visitHistory.map((item) => (
                <button
                  type="button"
                  className="mc-visit-history-item"
                  key={item.record_id || item.id}
                  onClick={() => navigate(`/medical-records/${item.id || item.record_id}`)}
                >
                  <span>{formatRecordCode(item)}</span>
                  <strong>{item.diagnosis || 'Chưa chẩn đoán'}</strong>
                  <small>{formatDate(item.visit_date || item.created_at)}</small>
                  <StatusBadge value={item.status} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="Ch?a c? l?ch s? ?i?u tr?" />
          )}
        </article>
      </section>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
