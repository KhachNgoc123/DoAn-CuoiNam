import { EMPTY_TEXT, formatDate, formatPatientCode } from './formatters'

export const todayValue = () => new Date().toISOString().slice(0, 10)

export const metricFormDefaults = {
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

export const metricDefinitions = [
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

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function metricTypeName(metric) {
  return metric.health_type?.health_type_name || metric.healthType?.health_type_name || 'Chỉ số'
}

export function metricUnit(metric) {
  return metric.health_type?.unit || metric.healthType?.unit || ''
}

export function metricValueText(metric) {
  if (!metric) return EMPTY_TEXT
  const unit = metricUnit(metric)
  return `${metric.value ?? EMPTY_TEXT}${unit ? ` ${unit}` : ''}`
}

export function metricDate(metric) {
  return String(metric.measure_time || metric.created_at || '').slice(0, 10)
}

export function metricNumericValue(metric) {
  const match = String(metric?.metric_value ?? metric?.value ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

export function patientLabel(patient) {
  if (!patient) return EMPTY_TEXT
  return patient.full_name || `Bệnh nhân #${patient.patient_id || patient.id}`
}

export function patientCode(patient) {
  const code = formatPatientCode(patient)
  return code === EMPTY_TEXT ? `BN-${String(patient?.patient_id || patient?.id || '').padStart(3, '0')}` : code
}

export function patientStatus(patient) {
  const status = normalizeText(patient?.current_record_status || patient?.status || patient?.treatment_status)
  if (!status) return false
  return !['da xong', 'da hoan thanh', 'hoan thanh', 'da huy'].some((value) => status.includes(value))
}

export function newestMetrics(metrics, limit = metrics.length) {
  return [...metrics]
    .sort((left, right) => {
      const leftTime = new Date(left.measure_time || left.created_at || 0).getTime()
      const rightTime = new Date(right.measure_time || right.created_at || 0).getTime()
      return rightTime - leftTime
    })
    .slice(0, limit)
}

export function findHealthType(healthTypes, terms) {
  return healthTypes.find((type) => {
    const name = normalizeText(type.health_type_name)
    return terms.some((term) => name.includes(normalizeText(term)))
  })
}

export function findMetric(group, terms) {
  return group.metrics.find((metric) => {
    const name = normalizeText(metricTypeName(metric))
    return terms.some((term) => name.includes(normalizeText(term)))
  })
}

export function metricOpenAlerts(metric) {
  return (metric.alerts || []).filter((alert) => alert.status === 'open')
}

export function metricThresholdWarning(metric) {
  const value = metricNumericValue(metric)
  const minValue = Number(metric.health_type?.min_value ?? metric.healthType?.min_value)
  const maxValue = Number(metric.health_type?.max_value ?? metric.healthType?.max_value)
  if (value === null) return ''
  if (!Number.isNaN(maxValue) && value > maxValue) return `${metricTypeName(metric)} cao hơn ngưỡng bình thường`
  if (!Number.isNaN(minValue) && value < minValue) return `${metricTypeName(metric)} thấp hơn ngưỡng bình thường`
  return ''
}

export function metricWarnings(metric) {
  const openAlerts = metricOpenAlerts(metric).map((alert) => alert.message).filter(Boolean)
  const threshold = metricThresholdWarning(metric)
  return [...openAlerts, threshold].filter(Boolean)
}

export function groupWarnings(group) {
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

export function groupWarningText(group) {
  const warnings = groupWarnings(group)
  if (!warnings.length) return 'Bình thường'
  return `⚠ ${warnings[0].message}`
}

export function bloodPressureText(group) {
  const systolic = findMetric(group, metricDefinitions.find((metric) => metric.key === 'systolic').terms)
  const diastolic = findMetric(group, metricDefinitions.find((metric) => metric.key === 'diastolic').terms)
  if (systolic && diastolic) return `${systolic.value}/${diastolic.value} mmHg`

  const combined = findMetric(group, ['huyet ap', 'blood pressure'])
  return combined ? metricValueText(combined) : EMPTY_TEXT
}

export function currentMetricText(group, key) {
  const definition = metricDefinitions.find((metric) => metric.key === key)
  const metric = definition ? findMetric(group, definition.terms) : null
  return metric ? metricValueText(metric) : EMPTY_TEXT
}

export function bmiText(group) {
  const weight = metricNumericValue(findMetric(group, metricDefinitions.find((metric) => metric.key === 'weight').terms))
  const height = metricNumericValue(findMetric(group, metricDefinitions.find((metric) => metric.key === 'height').terms))
  if (!weight || !height) return EMPTY_TEXT
  const heightInMeter = height > 3 ? height / 100 : height
  return (weight / (heightInMeter * heightInMeter)).toFixed(1)
}

export function groupMetricsByDate(metrics) {
  const grouped = new Map()
  newestMetrics(metrics).forEach((metric) => {
    const date = metricDate(metric) || 'unknown'
    if (!grouped.has(date)) grouped.set(date, [])
    grouped.get(date).push(metric)
  })
  return Array.from(grouped.entries()).map(([date, items]) => ({ date, metrics: items }))
}

export function metricForDate(dayMetrics, key) {
  const definition = metricDefinitions.find((metric) => metric.key === key)
  if (!definition) return null
  return dayMetrics.find((metric) => {
    const name = normalizeText(metricTypeName(metric))
    return definition.terms.some((term) => name.includes(normalizeText(term)))
  })
}

export function dateHistoryRow(dayMetrics) {
  const fakeGroup = { metrics: dayMetrics }
  return {
    bloodPressure: bloodPressureText(fakeGroup),
    heartRate: metricValueText(metricForDate(dayMetrics, 'heart_rate')),
    temperature: metricValueText(metricForDate(dayMetrics, 'temperature')),
    spo2: metricValueText(metricForDate(dayMetrics, 'spo2')),
  }
}


export function firstMetricDate(group) {
  return group.latestMetric ? formatDate(group.latestMetric.measure_time) : EMPTY_TEXT
}

export function prescriptionCode(prescription) {
  return prescription?.code || `DT${String(prescription?.prescription_id || '').padStart(3, '0')}`
}

export function treatmentRange(prescription) {
  return [formatDate(prescription?.start_date), formatDate(prescription?.end_date)].filter(Boolean).join(' - ') || EMPTY_TEXT
}

export function patientGroupsFromData(patients, metrics, filters) {
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
