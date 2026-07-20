import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, FileSpreadsheet, Pencil, Pill, Printer } from 'lucide-react'
import { getList, getOne, updateOne } from '../api/resources'
import { getErrorMessage } from '../api/client'
import LoadingState from '../components/ui/LoadingState'
import EmptyState from '../components/ui/EmptyState'
import MedicalRecordForm from '../components/medical-records/MedicalRecordForm'
import Toast from '../components/ui/Toast'
import StatusBadge from '../components/ui/StatusBadge'
import {
  EMPTY_TEXT,
  formatDate,
  formatGender,
  formatPatientCode,
  statusAfterEndDate,
} from '../utils/formatters'
import { downloadStyledExcel } from '../utils/excelExport'

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
        status: item.status || 'Äang theo dÃµi',
      }))
    : []

  const textRows = splitTextList(patient.underlying_disease).map((name, index) => ({
    id: `underlying-${index}`,
    disease_name: name,
    duration: '',
    status: 'Äang theo dÃµi',
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
        severity: item.severity || item.level || 'Cáº§n kiá»ƒm tra',
        source: item.source || 'NgÆ°á»i bá»‡nh cung cáº¥p',
      }))
    : []

  const textRows = splitTextList([patient.allergy, record.allergy].filter(Boolean).join(', ')).map(
    (name, index) => ({
      id: `allergy-text-${index}`,
      medicine_name: name,
      reaction: '',
      severity: 'Cáº§n kiá»ƒm tra',
      source: 'BÃ¡c sÄ© ghi nháº­n',
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
        return [name, dosage, frequency].filter(Boolean).join(' â€” ')
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
      setToast({ type: 'success', message: 'ÄÃ£ cáº­p nháº­t há»“ sÆ¡ bá»‡nh Ã¡n.' })
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const patient = record?.patient || {}
  const chronicRows = useMemo(() => chronicDiseaseRows(patient), [patient])
  const allergyHistoryRows = useMemo(() => allergyRows(patient, record || {}), [patient, record])
  const prescriptions = latestPrescriptionRows(record?.prescriptions || [])
  const schedules = collectSchedules(record?.prescriptions || [])
  const metricMap = record ? latestMetricMap(record) : new Map()
  const bloodPressure = findMetric(metricMap, ['huyáº¿t Ã¡p', 'huyet ap', 'blood pressure'])
  const weight = findMetric(metricMap, ['cÃ¢n náº·ng', 'can nang', 'weight'])
  const spo2 = findMetric(metricMap, ['spo2', 'sp o2', 'oxy'])

  function exportRecordExcel() {
    downloadStyledExcel(`${formatRecordCode(record)}.xls`, {
      title: 'Chi tiáº¿t há»“ sÆ¡ bá»‡nh Ã¡n',
      rows: [
        ['Chi tiáº¿t há»“ sÆ¡ bá»‡nh Ã¡n'],
        ['MÃ£ há»“ sÆ¡', formatRecordCode(record)],
        ['NgÃ y khÃ¡m', formatDate(record.visit_date)],
        ['Bá»‡nh nhÃ¢n', patient.full_name || ''],
        ['BÃ¡c sÄ© phá»¥ trÃ¡ch', record.doctor?.full_name || ''],
        ['Triá»‡u chá»©ng', record.symptoms || record.chief_complaint || ''],
        ['Cháº©n Ä‘oÃ¡n', record.diagnosis || ''],
        ['Ghi chÃº bÃ¡c sÄ©', record.doctor_note || ''],
        ['Tráº¡ng thÃ¡i', record.status || ''],
        [],
        ['ÄÆ¡n thuá»‘c liÃªn quan'],
        ['MÃ£ toa', 'NgÃ y báº¯t Ä‘áº§u', 'NgÃ y káº¿t thÃºc', 'Tráº¡ng thÃ¡i', 'Thuá»‘c'],
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
        <EmptyState title="KhÃ´ng tÃ¬m tháº¥y há»“ sÆ¡ hoáº·c báº¡n khÃ´ng cÃ³ quyá»n xem" />
      </main>
    )
  }

  if (editing) {
    return (
      <main className="page medical-record-entry-page">
        <section className="mc-list-hero">
          <div>
            <h1>Cáº­p nháº­t há»“ sÆ¡ bá»‡nh Ã¡n</h1>
            <p>{formatRecordCode(record)} â€¢ NgÃ y khÃ¡m {formatDate(record.visit_date)}</p>
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
          <h1>Chi tiáº¿t há»“ sÆ¡ bá»‡nh Ã¡n</h1>
          <p>{formatRecordCode(record)} â€¢ NgÃ y khÃ¡m {formatDate(record.visit_date)}</p>
        </div>
        <div className="mc-detail-actions">
          <button className="secondary-button" onClick={() => navigate('/medical-records')}>
            <ArrowLeft size={16} /> Quay láº¡i
          </button>
          {record.can_edit !== false && (
            <button className="mc-warning-button" onClick={() => setEditing(true)}>
              <Pencil size={16} /> Cáº­p nháº­t há»“ sÆ¡
            </button>
          )}
          {record.can_prescribe && (
            <button
              className="primary-button"
              onClick={() => navigate('/prescriptions', { state: { mode: 'create', recordId: record.record_id } })}
            >
              <Pill size={16} /> KÃª toa thuá»‘c
            </button>
          )}
          <button className="secondary-button" onClick={exportRecordExcel}>
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button className="secondary-button" onClick={() => window.print()}>
            <Printer size={16} /> In há»“ sÆ¡
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
            <CalendarClock size={16} /> Táº¡o lá»‹ch uá»‘ng
          </button>
        </div>
      </section>

      <section className="mc-record-detail-grid">
        <article className="mc-record-card">
          <h2>ThÃ´ng tin bá»‡nh nhÃ¢n</h2>
          <div className="record-info-grid compact">
            <InfoItem label="MÃ£ bá»‡nh nhÃ¢n" value={formatPatientCode(patient || { patient_id: record.patient_id })} />
            <InfoItem label="Há» tÃªn" value={patient.full_name} />
            <InfoItem label="Giá»›i tÃ­nh" value={formatGender(patient.gender)} />
            <InfoItem label="NgÃ y sinh" value={formatDate(patient.date_of_birth)} />
            <InfoItem label="Sá»‘ Ä‘iá»‡n thoáº¡i" value={patient.phone} className="wide" />
            <InfoItem label="Äá»‹a chá»‰" value={patient.address} className="wide" />
          </div>
        </article>

        <article className="mc-record-card">
          <div className="mc-record-title-row">
            <h2>ThÃ´ng tin há»“ sÆ¡</h2>
            <StatusBadge value={record.status} />
          </div>
          <div className="record-info-grid">
            <InfoItem label="MÃ£ há»“ sÆ¡" value={formatRecordCode(record)} />
            <InfoItem label="NgÃ y khÃ¡m" value={formatDate(record.visit_date)} />
            <InfoItem label="Triá»‡u chá»©ng" value={record.symptoms || record.chief_complaint} />
            <InfoItem label="Cháº©n Ä‘oÃ¡n" value={record.diagnosis} />
            <InfoItem label="Ghi chÃº bÃ¡c sÄ©" value={record.doctor_note} />
          </div>
        </article>

        <article className="mc-record-card">
          <h2>Bá»‡nh ná»n / tiá»n sá»­</h2>
          {chronicRows.length ? (
            <div className="mc-record-stack">
              {chronicRows.map((item) => (
                <div className="record-info-tile" key={item.id}>
                  <span>TÃªn bá»‡nh</span>
                  <strong>{item.disease_name}</strong>
                  {(item.duration || item.status) && <small>{[item.duration, item.status].filter(Boolean).join(' â€¢ ')}</small>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="ChÆ°a ghi nháº­n bá»‡nh ná»n" />
          )}
        </article>

        <article className="mc-record-card">
          <h2>Dá»‹ á»©ng thuá»‘c</h2>
          {allergyHistoryRows.length ? (
            <div className="mc-record-stack">
              {allergyHistoryRows.map((item) => (
                <div className="mc-allergy-box" key={item.id}>
                  <strong>{item.medicine_name}</strong>
                  <span>{[item.reaction, `Má»©c Ä‘á»™: ${item.severity}`].filter(Boolean).join(' â€¢ ')}</span>
                  <small>Nguá»“n: {item.source || 'NgÆ°á»i bá»‡nh cung cáº¥p'}</small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="ChÆ°a ghi nháº­n dá»‹ á»©ng thuá»‘c" />
          )}
        </article>

        <article className="mc-record-card">
          <h2>Theo dÃµi sá»©c khá»e</h2>
          <div className="mc-health-mini-grid">
            <div>
              <span>Huyáº¿t Ã¡p</span>
              <strong>{metricValue(bloodPressure)}</strong>
            </div>
            <div>
              <span>CÃ¢n náº·ng</span>
              <strong>{metricValue(weight)}</strong>
            </div>
            <div>
              <span>SpO2</span>
              <strong>{metricValue(spo2)}</strong>
            </div>
          </div>
          {bloodPressure && (
            <div className="mc-record-warning">âš  Huyáº¿t Ã¡p cao â€” vÆ°á»£t ngÆ°á»¡ng theo dÃµi</div>
          )}
        </article>

        <article className="mc-record-card mc-record-related-card">
          <h2>Lịch sử toa thuốc</h2>
          {prescriptions.length ? (
            <div className="mc-record-stack">
              {prescriptions.map((prescription) => (
                <div className="mc-prescription-summary" key={prescription.prescription_id}>
                  <strong>{formatPrescriptionCode(prescription)} â€¢ {formatDate(prescription.start_date)}</strong>
                  <StatusBadge value={statusAfterEndDate(prescription)} />
                  <p>{prescriptionMedicineText(prescription)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="ChÆ°a cÃ³ toa thuá»‘c" />
          )}
          {schedules.length ? (
            <small className="mc-related-note">{schedules.length} lá»‹ch uá»‘ng thuá»‘c Ä‘Ã£ Ä‘Æ°á»£c táº¡o tá»« há»“ sÆ¡ nÃ y.</small>
          ) : null}
        </article>

        <article className="mc-record-card mc-visit-history-card">
          <h2>Lịch sử điều trị</h2>
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
                  <strong>{item.diagnosis || 'ChÆ°a cháº©n Ä‘oÃ¡n'}</strong>
                  <small>{formatDate(item.visit_date || item.created_at)}</small>
                  <StatusBadge value={item.status} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có lịch sử điều trị" />
          )}
        </article>
      </section>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
