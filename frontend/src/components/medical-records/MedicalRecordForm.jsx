import { useEffect, useState } from 'react'
import Field from '../common/Field/Field'
import FormSection from '../common/FormSection/FormSection'
import SuggestedTextarea from './SuggestedTextarea'
import {
  EMPTY_TEXT,
  formatDate,
  formatGender,
  formatPatientCode,
  toApiDateValue,
  toDateInputValue,
} from '../../utils/formatters'

const editableFields = [
  'patient_id',
  'visit_date',
  'symptoms',
  'diagnosis',
  'doctor_note',
  'status',
]

const basicMetricFields = [
  {
    key: 'weight',
    label: 'Cân nặng',
    unit: 'kg',
    placeholder: 'Ví dụ: 62',
    aliases: ['cân nặng', 'can nang', 'weight'],
  },
  {
    key: 'height',
    label: 'Chiều cao',
    unit: 'cm',
    placeholder: 'Ví dụ: 170',
    aliases: ['chiều cao', 'chieu cao', 'height'],
  },
  {
    key: 'blood_pressure',
    label: 'Huyết áp',
    unit: 'mmHg',
    placeholder: 'Ví dụ: 120/80',
    aliases: ['huyết áp', 'huyet ap', 'blood pressure'],
  },
]

function todayInputValue() {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${today.getFullYear()}-${month}-${day}`
}

function valueOrEmpty(value) {
  return value || EMPTY_TEXT
}

function PatientInfoItem({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{valueOrEmpty(value)}</strong>
    </div>
  )
}

function normalizeMetricName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function findMetricType(field, healthTypes) {
  return healthTypes.find((type) => {
    const name = normalizeMetricName(type.health_type_name || type.name || type.type_name)
    return field.aliases.some((alias) => name.includes(normalizeMetricName(alias)))
  })
}

function parseMetricNumber(value) {
  const normalized = String(value || '').trim().replace(',', '.')
  if (!normalized) return null
  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

function validateBasicMetric(key, value) {
  const text = String(value || '').trim()
  if (!text) return ''

  if (key === 'weight') {
    const weight = parseMetricNumber(text)
    return weight !== null && weight >= 1 && weight <= 300
      ? ''
      : 'Cân nặng phải trong khoảng 1-300 kg.'
  }

  if (key === 'height') {
    const height = parseMetricNumber(text)
    return height !== null && height >= 30 && height <= 250
      ? ''
      : 'Chiều cao phải trong khoảng 30-250 cm.'
  }

  if (key === 'blood_pressure') {
    const match = text.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/)
    if (!match) return 'Huyết áp phải nhập dạng 120/80.'

    const systolic = Number(match[1])
    const diastolic = Number(match[2])
    if (systolic < 50 || systolic > 250 || diastolic < 30 || diastolic > 150) {
      return 'Huyết áp phải trong khoảng hợp lý.'
    }

  return systolic > diastolic ? '' : 'Huyết áp tâm thu phải lớn hơn tâm trương.'
  }

  return ''
}

function validateBasicMetrics(values = {}) {
  return Object.fromEntries(
    basicMetricFields.map((field) => [field.key, validateBasicMetric(field.key, values[field.key])]),
  )
}

function hasNestedErrors(errors) {
  return Object.values(errors).some((value) =>
    value && typeof value === 'object' ? hasNestedErrors(value) : Boolean(value),
  )
}

export default function MedicalRecordForm({
  initialValue,
  patients,
  healthTypes = [],
  recordSuggestions = {},
  loading,
  onSubmit,
  onCancel,
  onDraftChange,
}) {
  const isEdit = Boolean(initialValue?.record_id || initialValue?.id)
  const patient =
    initialValue?.patient ||
    patients.find((item) => String(item.patient_id) === String(initialValue?.patient_id))
  const [form, setForm] = useState(() => ({
    patient_id: '',
    symptoms: '',
    diagnosis: '',
    doctor_note: '',
    status: 'Đang điều trị',
    ...initialValue,
    visit_date: toDateInputValue(initialValue?.visit_date) || todayInputValue(),
    basic_metrics: basicMetricFields.reduce(
      (values, field) => ({
        ...values,
        [field.key]: initialValue?.basic_metrics?.[field.key] || '',
      }),
      {},
    ),
  }))
  const [fieldErrors, setFieldErrors] = useState({})

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
  }

  useEffect(() => {
    if (!isEdit) {
      onDraftChange?.(form)
    }
  }, [form, isEdit, onDraftChange])

  function submit(event) {
    event.preventDefault()
    const visitDate = toApiDateValue(form.visit_date)
    const basicMetricErrors = validateBasicMetrics(form.basic_metrics)
    const nextErrors = {
      patient_id: form.patient_id ? '' : 'Vui lòng chọn bệnh nhân.',
      visit_date: visitDate ? '' : 'Vui lòng chọn ngày tạo hồ sơ hợp lệ.',
      diagnosis: form.diagnosis?.trim() ? '' : 'Vui lòng nhập chẩn đoán.',
      basic_metrics: basicMetricErrors,
    }
    setFieldErrors(nextErrors)
    if (hasNestedErrors(nextErrors)) return

    const payload = Object.fromEntries(editableFields.map((field) => [field, form[field] || null]))
    payload.visit_date = visitDate
    payload._basic_metrics = basicMetricFields
      .map((field) => ({
        ...field,
        health_type: findMetricType(field, healthTypes),
        value: form.basic_metrics?.[field.key]?.trim() || '',
      }))
      .filter((metric) => metric.value && metric.health_type)
      .map((metric) => ({
        health_type_id: metric.health_type.health_type_id,
        value: metric.value,
        note: `Nhập trong hồ sơ tạo ngày ${formatDate(visitDate)}`,
      }))
    if (!isEdit) payload.status = 'Đang điều trị'
    onSubmit(payload)
  }

  return (
    <form className="stack-form medical-record-form" onSubmit={submit}>
      <div className="form-scroll-content">
        <FormSection title="Thông tin hồ sơ bệnh án">
          <div className="record-patient-summary field-wide">
            <div className="record-patient-summary-head">
              <div>
                <span>Bệnh nhân</span>
                <h2>{patient?.full_name || 'Chưa xác định bệnh nhân'}</h2>
              </div>
              <strong>{formatPatientCode(patient || { patient_id: form.patient_id })}</strong>
            </div>
            <div className="record-patient-summary-grid">
              <PatientInfoItem label="Giới tính" value={formatGender(patient?.gender)} />
              <PatientInfoItem label="Ngày sinh" value={formatDate(patient?.date_of_birth)} />
              <PatientInfoItem label="Số điện thoại" value={patient?.phone} />
              <PatientInfoItem label="Địa chỉ" value={patient?.address} />
            </div>
            {fieldErrors.patient_id && <div className="form-error">{fieldErrors.patient_id}</div>}
          </div>

          <div className="visit-context-grid field-wide">
            <div className="visit-context-item">
              <span>Người nhập hồ sơ</span>
              <strong>Bác sĩ phụ trách</strong>
              <small>Dữ liệu gắn với ca khám hiện tại</small>
            </div>
            <div className="visit-context-item">
              <span>Ngày tạo hồ sơ</span>
              <input
                className="visit-date-input"
                type="date"
                value={form.visit_date || ''}
                max={todayInputValue()}
                onChange={(event) => set('visit_date', event.target.value)}
              />
              <small>
                {formatDate(form.visit_date)}
                {isEdit ? ' - có thể chỉnh ngày khám' : ' - có thể chọn ngày khám'}
              </small>
              {fieldErrors.visit_date && <div className="form-error">{fieldErrors.visit_date}</div>}
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Chỉ số cơ bản"
         
        >
          <div className="basic-metric-grid field-wide">
            {basicMetricFields.map((field) => {
              const type = findMetricType(field, healthTypes)
              const metricError = fieldErrors.basic_metrics?.[field.key]
              return (
                <label className="basic-metric-field" key={field.key}>
                  <span>
                    {field.label}
                    {field.unit ? <small>({field.unit})</small> : null}
                  </span>
                  <div className={metricError ? 'field-control-wrap has-error' : 'field-control-wrap'}>
                    <input
                      value={form.basic_metrics?.[field.key] || ''}
                      placeholder={type ? field.placeholder : 'Chưa có loại chỉ số trong DB'}
                      disabled={!type}
                      aria-invalid={Boolean(metricError)}
                      onChange={(event) =>
                        set('basic_metrics', {
                          ...form.basic_metrics,
                          [field.key]: event.target.value,
                        })
                      }
                    />
                    {metricError && (
                      <span className="field-error-mark" aria-label={metricError}>
                        !
                      </span>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        </FormSection>

        <FormSection title="Chẩn đoán">
          <Field label="Triệu chứng">
            <SuggestedTextarea
              placeholder="Nhập nhiều triệu chứng, ngăn cách bằng dấu phẩy. Ví dụ: ho, sốt, đau họng"
              suggestions={recordSuggestions.symptoms}
              value={form.symptoms || ''}
              multiple
              onChange={(value) => set('symptoms', value)}
            />
          </Field>
          <Field label="Chẩn đoán" required>
            <SuggestedTextarea
              placeholder="Nhập chẩn đoán chính hoặc chẩn đoán sơ bộ..."
              suggestions={recordSuggestions.diagnosis}
              value={form.diagnosis || ''}
              error={fieldErrors.diagnosis}
              onChange={(value) => set('diagnosis', value)}
            />
          </Field>
        </FormSection>

        <FormSection title="Điều trị">
          <Field label="Ghi chú bác sĩ">
            <SuggestedTextarea
              placeholder="Ghi chú chuyên môn, dặn dò riêng hoặc lưu ý khi kê toa..."
              suggestions={recordSuggestions.doctor_note}
              value={form.doctor_note || ''}
              onChange={(value) => set('doctor_note', value)}
            />
          </Field>
          {isEdit && (
            <Field label="Cập nhật trạng thái điều trị">
              <select
                value={form.status || 'Đang điều trị'}
                onChange={(event) => set('status', event.target.value)}
              >
                <option value="Đang điều trị">Đang điều trị</option>
                <option value="Đã hoàn thành">Đã hoàn thành</option>
              </select>
            </Field>
          )}
        </FormSection>
      </div>

      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Hủy
        </button>
        <button className="primary-button" disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu hồ sơ'}
        </button>
      </div>
    </form>
  )
}
