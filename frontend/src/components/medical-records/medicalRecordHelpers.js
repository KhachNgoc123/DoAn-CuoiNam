import { EMPTY_TEXT } from '../../utils/formatters'

export function formatRecordCode(record) {
  return record?.record_code || `HS-${String(record?.record_id || record?.id || '').padStart(3, '0')}`
}

export function formatPrescriptionCode(prescription) {
  return prescription?.prescription_code || `DT${String(prescription?.prescription_id || '').padStart(3, '0')}`
}

export function splitTextList(value) {
  return String(value || '')
    .split(/[,;|\n]+/u)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function displayText(value) {
  return value === null || value === undefined || value === '' ? EMPTY_TEXT : value
}

export function chronicDiseaseRows(patient = {}) {
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

export function allergyRows(patient = {}, record = {}) {
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

export function latestPrescriptionRows(prescriptions = []) {
  return [...prescriptions]
    .sort((left, right) => String(right.start_date || '').localeCompare(String(left.start_date || '')))
    .slice(0, 2)
}

export function prescriptionMedicineText(prescription) {
  return (
    prescription.details
      ?.map((detail) => {
        const name = detail.medicine?.medicine_name || detail.medicine_name
        const dosage = detail.dosage
        const frequency =
          detail.frequency_type?.frequency_name ||
          detail.frequencyType?.frequency_name ||
          detail.frequency_type?.type_name
        return [name, dosage, frequency].filter(Boolean).join(' - ')
      })
      .filter(Boolean)
      .join('\n') || EMPTY_TEXT
  )
}

export function collectSchedules(prescriptions = []) {
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

export function metricName(metric) {
  return metric?.health_type?.health_type_name || metric?.healthType?.health_type_name || ''
}

export function metricUnit(metric) {
  return metric?.health_type?.unit || metric?.healthType?.unit || ''
}

export function metricValue(metric) {
  if (!metric) return EMPTY_TEXT
  return `${metric.value ?? metric.metric_value ?? EMPTY_TEXT}${metricUnit(metric) ? metricUnit(metric) : ''}`
}

export function latestMetricMap(record) {
  const metrics = [...(record.visit_metrics || []), ...(record.latest_health_metrics || [])]
  const map = new Map()
  metrics.forEach((metric) => {
    const key = String(metricName(metric)).toLowerCase()
    if (!map.has(key)) map.set(key, metric)
  })
  return map
}

export function findMetric(metrics, keywords) {
  return Array.from(metrics.entries()).find(([name]) =>
    keywords.some((keyword) => name.includes(keyword)),
  )?.[1]
}
