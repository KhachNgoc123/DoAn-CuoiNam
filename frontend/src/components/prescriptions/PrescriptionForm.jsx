import { useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import FormSection from '../ui/FormSection'
import Field from '../ui/Field'
import { formatDate, toApiDateValue } from '../../utils/formatters'

const emptyDetail = {
  medicine_id: '',
  dosage: '',
  frequency_type_id: '',
  meal_time_id: '',
  quantity: '',
  note: '',
}

function padDatePart(value) {
  return String(value).padStart(2, '0')
}

function toDisplayDate(date) {
  return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear()}`
}

function parseApiDate(value) {
  const apiDate = toApiDateValue(value)
  if (!apiDate) return null
  const [year, month, day] = apiDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function calculateEndDate(startDate, daysValue) {
  const start = parseApiDate(startDate)
  const days = Number(daysValue)
  if (!start || !Number.isFinite(days) || days <= 0) return ''
  const endDate = new Date(start)
  endDate.setDate(endDate.getDate() + days + 1)
  return toDisplayDate(endDate)
}

function daysBetween(startDate, endDate) {
  const start = parseApiDate(startDate)
  const end = parseApiDate(endDate)
  if (!start || !end || end <= start) return ''
  return String(Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) - 1))
}

function durationDays(startDate, endDate, daysValue) {
  const days = Number(daysValue)
  if (Number.isFinite(days) && days > 0) return days
  const start = parseApiDate(startDate)
  const end = parseApiDate(endDate)
  if (!start || !end || end <= start) return 1
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) - 1)
}

function dosageAmount(value) {
  const text = String(value || '').replace(',', '.')
  const fraction = text.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/)
  if (fraction) {
    const numerator = Number(fraction[1])
    const denominator = Number(fraction[2])
    return denominator ? numerator / denominator : 0
  }
  const number = text.match(/\d+(?:\.\d+)?/)
  return number ? Number(number[0]) : 0
}

function frequencyTimesPerDay(detail, frequencyTypes) {
  const frequency = frequencyTypes.find(
    (item) => String(frequencyId(item)) === String(detail.frequency_type_id || ''),
  )
  if (frequency?.times_per_day) return Number(frequency.times_per_day)
  const label = frequencyLabel(frequency)
  const number = String(label || '').match(/\d+/)
  return number ? Number(number[0]) : 0
}

function calculatedQuantity(detail, form, frequencyTypes) {
  const days = durationDays(form.start_date, form.end_date, form.duration_days)
  const dose = dosageAmount(detail.dosage)
  const times = frequencyTimesPerDay(detail, frequencyTypes)
  if (!days || !dose || !times) return ''
  return Math.max(1, Math.ceil(days * dose * times))
}

function selectedMedicine(detail, medicines) {
  return medicines.find((item) => String(item.medicine_id) === String(detail.medicine_id || ''))
}

function medicineUnit(detail, medicines) {
  const unit = selectedMedicine(detail, medicines)?.unit || ''
  const normalized = normalizeText(unit)
  if (normalized.includes('vien')) return 'viên'
  if (normalized.includes('chai') || normalized.includes('lo')) return 'chai'
  if (normalized.includes('bit') || normalized.includes('bich') || normalized.includes('goi')) return unit || 'bịch'
  if (normalized.includes('vi')) return 'vỉ'
  return unit || 'viên'
}

function todayInputValue() {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${day}/${month}/${today.getFullYear()}`
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function medicineLabel(medicine) {
  return medicine?.medicine_name || ''
}

function medicineDescription(medicine) {
  return medicine?.unit || ''
}

function frequencyId(item) {
  return item?.frequency_type_id || item?.frequency_id || ''
}

function frequencyLabel(item) {
  return item?.type_name || item?.frequency_name || ''
}

function mealLabel(item) {
  return item?.meal_time_name || ''
}

function recordLabel(record) {
  return record?.patient?.full_name || ''
}

function recordDescription(record) {
  return [`BA-${String(record?.record_id || '').padStart(2, '0')}`, formatDate(record?.visit_date)]
    .filter(Boolean)
    .join(' - ')
}

function selectedRecordText(form, medicalRecords) {
  return (
    form.record_text ??
    recordLabel(
      medicalRecords.find((record) => String(record.record_id) === String(form.record_id || '')),
    )
  )
}

function selectedRecord(form, medicalRecords) {
  return medicalRecords.find((record) => String(record.record_id) === String(form.record_id || ''))
}

function patientFromRecord(record) {
  return record?.patient || {}
}

function listNames(items, key) {
  return Array.isArray(items)
    ? items
        .map((item) => item?.[key])
        .filter(Boolean)
        .join(', ')
    : ''
}

function allergyTextForRecord(record) {
  const patient = patientFromRecord(record)
  const relationText = listNames(patient.allergies, 'allergy_name')
  return [relationText || patient.allergy, record?.allergy]
    .filter(Boolean)
    .join(', ')
}

function underlyingDiseaseTextForRecord(record) {
  const patient = patientFromRecord(record)
  const relationText = listNames(patient.chronic_diseases, 'disease_name')
  return [relationText || patient.underlying_disease, record?.medical_history].filter(Boolean).join(', ')
}

function listTokens(value) {
  return String(value || '')
    .split(/[,;\n]+/u)
    .map((item) => normalizeText(item).trim())
    .filter(Boolean)
}

function medicineMatchesAllergy(medicineName, allergyText) {
  const medicine = normalizeText(medicineName)
  if (!medicine) return false
  return listTokens(allergyText).some((token) => token && (medicine.includes(token) || token.includes(medicine)))
}

function selectedMedicineText(detail, medicines) {
  return (
    detail.medicine_text ??
    medicineLabel(
      medicines.find((item) => String(item.medicine_id) === String(detail.medicine_id || '')),
    )
  )
}

function selectedFrequencyText(detail, frequencyTypes) {
  return frequencyLabel(
    frequencyTypes.find(
      (item) => String(frequencyId(item)) === String(detail.frequency_type_id || ''),
    ),
  )
}

function selectedMealText(detail, mealTimes) {
  return (
    detail.meal_time_text ??
    mealLabel(
      mealTimes.find((item) => String(item.meal_time_id) === String(detail.meal_time_id || '')),
    )
  )
}

function CheckboxOptionGroup({ options, value, getValue, getLabel, onChange, emptyText }) {
  if (!options.length) {
    return <div className="muted-text">{emptyText}</div>
  }

  return (
    <div className="checkbox-option-group">
      {options.map((option) => {
        const optionValue = getValue(option)
        const active = String(value || '') === String(optionValue)
        return (
          <label className={active ? 'checkbox-option active' : 'checkbox-option'} key={optionValue}>
            <input
              type="checkbox"
              checked={active}
              onChange={() => onChange(active ? '' : optionValue, option)}
            />
            <span>{getLabel(option)}</span>
          </label>
        )
      })}
    </div>
  )
}

function SuggestionInput({
  value,
  options,
  placeholder,
  emptyText = 'Không tìm thấy gợi ý',
  getLabel,
  getDescription,
  onChange,
  onSelect,
}) {
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  const optionRefs = useRef([])
  const keyword = normalizeText(value)
  const suggestions = options
    .filter((option) => !keyword || normalizeText(getLabel(option)).includes(keyword))
    .slice(0, 8)
  const showSuggestions = focused && suggestions.length > 0

  function closeSuggestions() {
    setFocused(false)
    setActiveIndex(-1)
  }

  function choose(option) {
    onSelect(option)
    closeSuggestions()
  }

  function focusSuggestion(index) {
    if (!suggestions.length) return
    const nextIndex = (index + suggestions.length) % suggestions.length
    setFocused(true)
    setActiveIndex(nextIndex)
    window.requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus())
  }

  function handleSuggestionKeyDown(event, index) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusSuggestion(index + 1)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusSuggestion(index - 1)
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(suggestions[index])
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSuggestions()
      inputRef.current?.focus()
    }
  }

  return (
    <div
      className="suggestion-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          closeSuggestions()
        }
      }}
    >
      <input
        ref={inputRef}
        value={value || ''}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setFocused(true)}
        onChange={(event) => {
          onChange(event.target.value)
          setActiveIndex(-1)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && suggestions[0]) {
            event.preventDefault()
            choose(suggestions[0])
          }
          if ((event.key === 'Tab' && !event.shiftKey) || event.key === 'ArrowDown') {
            if (showSuggestions) {
              event.preventDefault()
              focusSuggestion(0)
            }
          }
          if (event.key === 'ArrowUp' && showSuggestions) {
            event.preventDefault()
            focusSuggestion(suggestions.length - 1)
          }
          if (event.key === 'Escape') {
            closeSuggestions()
          }
        }}
      />
      {showSuggestions && (
        <div className="suggestion-menu">
          {suggestions.map((option, index) => (
            <button
              type="button"
              key={`${getLabel(option)}-${index}`}
              ref={(element) => {
                optionRefs.current[index] = element
              }}
              className={activeIndex === index ? 'is-active' : undefined}
              tabIndex={activeIndex === index ? 0 : -1}
              onFocus={() => {
                setFocused(true)
                setActiveIndex(index)
              }}
              onKeyDown={(event) => handleSuggestionKeyDown(event, index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              <strong>{getLabel(option)}</strong>
              {getDescription?.(option) && <span>{getDescription(option)}</span>}
            </button>
          ))}
        </div>
      )}
      {focused && !suggestions.length && <div className="suggestion-menu muted">{emptyText}</div>}
    </div>
  )
}

export default function PrescriptionForm({
  initialValue,
  medicalRecords,
  medicines,
  frequencyTypes = [],
  mealTimes = [],
  workflow = '',
  loading,
  onSubmit,
  onCancel,
}) {
  const isNewPatientWorkflow = workflow === 'new-patient'
  const isEdit = Boolean(initialValue?.prescription_id || initialValue?.id)
  const [form, setForm] = useState(() => ({
    note: '',
    edit_reason: '',
    status: 'Đang sử dụng',
    ...initialValue,
    record_id: initialValue?.record_id || initialValue?.medical_record?.record_id || '',
    record_text: recordLabel(initialValue?.medical_record),
    start_date: initialValue?.prescription_date
      ? formatDate(initialValue.prescription_date)
      : initialValue?.start_date
        ? formatDate(initialValue.start_date)
        : todayInputValue(),
    end_date: initialValue?.end_date ? formatDate(initialValue.end_date) : '',
    duration_days: initialValue?.end_date
      ? daysBetween(
          initialValue?.start_date ? formatDate(initialValue.start_date) : todayInputValue(),
          initialValue.end_date,
        )
      : '',
    details: initialValue?.details?.length ? initialValue.details : [],
  }))
  const [draftDetail, setDraftDetail] = useState({ ...emptyDetail })
  const [fieldErrors, setFieldErrors] = useState({})
  const [medicineStepOpen, setMedicineStepOpen] = useState(
    isEdit,
  )
  const currentRecord = selectedRecord(form, medicalRecords) || initialValue?.medical_record || {}
  const currentAllergyText = allergyTextForRecord(currentRecord)
  const currentUnderlyingDiseaseText = underlyingDiseaseTextForRecord(currentRecord)
  const selectedMedicineNames = [draftDetail, ...form.details]
    .map((detail) => medicineLabel(selectedMedicine(detail, medicines)) || detail.medicine_text)
    .filter(Boolean)
  const allergyHits = selectedMedicineNames.filter((name) =>
    medicineMatchesAllergy(name, currentAllergyText),
  )
  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
  }
  const clearDraftDetailError = (key) =>
    setFieldErrors((current) => ({
      ...current,
      draftDetail: { ...(current.draftDetail || {}), [key]: '' },
    }))

  const updateDraftDetail = (key, value) => {
    setDraftDetail((current) => ({ ...current, [key]: value }))
    clearDraftDetailError(key)
  }

  const updateDraftDetailFields = (values) => {
    setDraftDetail((current) => ({ ...current, ...values }))
    Object.keys(values).forEach((key) => clearDraftDetailError(key))
  }

  function removeDetail(index) {
    setForm((current) => ({
      ...current,
      details: current.details.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function detailQuantity(detail) {
    return calculatedQuantity(detail, form, frequencyTypes) || detail.quantity || ''
  }

  function detailQuantityText(detail) {
    const quantity = detailQuantity(detail)
    if (!quantity) return ''
    return `${quantity} ${medicineUnit(detail, medicines)}`.trim()
  }

  function detailDosageText(detail) {
    const dosage = String(detail.dosage || '').trim()
    if (!dosage) return ''
    const unit = medicineUnit(detail, medicines)
    if (normalizeText(dosage).includes(normalizeText(unit)) || dosage.includes('/')) return dosage
    return `${dosage} ${unit}/lần`.trim()
  }

  function detailStockError(detail) {
  return detailQuantity(detail) ? '' : 'Chưa đủ dữ liệu để tính số lượng thuốc.'
  }

  function validateDetail(detail) {
    const quantity = detailQuantity(detail)
    const stockError = detailStockError(detail)
    return {
      medicine_id: detail.medicine_id ? '' : 'Vui lòng chọn thuốc.',
      dosage: dosageAmount(detail.dosage) > 0 ? '' : 'Vui lòng nhập liều lượng lớn hơn 0.',
      frequency_type_id: detail.frequency_type_id ? '' : 'Vui lòng chọn tần suất.',
      quantity: quantity ? stockError : 'Chưa đủ dữ liệu để tính số lượng thuốc.',
    }
  }

  function detailHasInput(detail) {
    return Boolean(
      detail.medicine_id ||
        detail.medicine_text ||
        detail.dosage ||
        detail.frequency_type_id ||
        detail.meal_time_id ||
        detail.note,
    )
  }

  function detailHasErrors(errors) {
    return Boolean(errors.medicine_id || errors.dosage || errors.frequency_type_id || errors.quantity)
  }

  function normalizeDetail(detail) {
    return {
      prescription_detail_id: detail.prescription_detail_id || null,
      medicine_id: detail.medicine_id,
      dosage: String(detail.dosage || '').trim() || null,
      frequency_type_id: detail.frequency_type_id || null,
      meal_time_id: detail.meal_time_id || null,
      quantity: Number(detailQuantity(detail)),
      note: detail.note || null,
    }
  }

  function findAllergyConflicts(details) {
    if (!currentAllergyText) return []
    const names = details
      .map((detail) => medicineLabel(selectedMedicine(detail, medicines)) || detail.medicine_text)
      .filter(Boolean)

    return Array.from(new Set(names.filter((name) => medicineMatchesAllergy(name, currentAllergyText))))
  }

  function addDraftDetail() {
    const infoResult = validatePrescriptionInfo()
    const detailErrors = validateDetail(draftDetail)
    setFieldErrors((current) => ({ ...current, draftDetail: detailErrors }))
    if (!infoResult.valid || detailHasErrors(detailErrors)) {
      return
    }
    setForm((current) => ({
      ...current,
      details: [...current.details, { ...draftDetail, quantity: detailQuantity(draftDetail) }],
    }))
    setDraftDetail({ ...emptyDetail })
    setFieldErrors((current) => ({ ...current, draftDetail: {} }))
  }

  function changeStartDate(value) {
    setForm((current) => ({
      ...current,
      start_date: value,
      end_date: current.duration_days
        ? calculateEndDate(value, current.duration_days)
        : current.end_date,
    }))
    setFieldErrors((current) => ({ ...current, start_date: '', duration_days: '', end_date: '' }))
  }

  function changeDurationDays(value) {
    setForm((current) => ({
      ...current,
      duration_days: value,
      end_date: value ? calculateEndDate(current.start_date, value) : '',
    }))
    setFieldErrors((current) => ({ ...current, duration_days: '', end_date: '' }))
  }

  function validatePrescriptionInfo() {
    const startDate = toApiDateValue(form.start_date)
    const duration = Number(form.duration_days)
    const endDate = form.end_date ? toApiDateValue(form.end_date) : null
    const nextErrors = {
      record_id: form.record_id ? '' : 'Vui lòng chọn bệnh nhân hoặc hồ sơ bệnh án.',
      start_date: startDate ? '' : 'Ngày bắt đầu phải nhập đúng định dạng dd/mm/yyyy.',
      duration_days:
        Number.isFinite(duration) && duration > 0 ? '' : 'Vui lòng nhập số ngày dùng thuốc.',
      end_date: endDate ? '' : 'Chưa tính được ngày kết thúc.',
      edit_reason:
        isEdit && !String(form.edit_reason || '').trim()
          ? 'Vui lòng nhập lý do chỉnh thuốc.'
          : '',
    }
    if (startDate && endDate && endDate < startDate) {
      nextErrors.end_date = 'Ngày kết thúc không được trước ngày bắt đầu.'
    }
    setFieldErrors(nextErrors)
    return {
      valid:
        !nextErrors.record_id &&
        !nextErrors.start_date &&
        !nextErrors.duration_days &&
        !nextErrors.end_date &&
        !nextErrors.edit_reason,
      startDate,
      endDate,
    }
  }

  function openMedicineStep() {
    const result = validatePrescriptionInfo()
    if (!result.valid) {
      return
    }
    setMedicineStepOpen(true)
  }

  function submit(event) {
    event.preventDefault()
    const infoResult = validatePrescriptionInfo()
    const committedDetails = [...form.details]
    const shouldUseDraft = detailHasInput(draftDetail) || !committedDetails.length
    const draftErrors = shouldUseDraft ? validateDetail(draftDetail) : {}
    const detailErrors = committedDetails.map(validateDetail)
    if (shouldUseDraft && !detailHasErrors(draftErrors)) {
      committedDetails.push({ ...draftDetail, quantity: detailQuantity(draftDetail) })
    }
    setFieldErrors((current) => ({ ...current, details: detailErrors, draftDetail: draftErrors }))
    if (
      !infoResult.valid ||
      detailErrors.some(detailHasErrors) ||
      (shouldUseDraft && detailHasErrors(draftErrors))
    ) {
      return
    }
    const conflicts = findAllergyConflicts(committedDetails)
    if (conflicts.length) {
      setFieldErrors((current) => ({
        ...current,
        allergy: `Bệnh nhân có tiền sử dị ứng với thuốc: ${conflicts.join(', ')}. Vui lòng kiểm tra lại trước khi kê toa.`,
      }))
      return
    }
    onSubmit({
      record_id: form.record_id,
      prescription_date: infoResult.startDate,
      start_date: infoResult.startDate,
      end_date: infoResult.endDate,
      duration_days: Number(form.duration_days),
      note: form.note || null,
      edit_reason: isEdit ? String(form.edit_reason || '').trim() : null,
      status: 'Đang sử dụng',
      details: committedDetails.map(normalizeDetail),
    })
  }

  return (
    <form className="stack-form compact-prescription-form" onSubmit={submit}>
      <FormSection title="Thông tin toa thuốc">
        <Field label="Hồ sơ bệnh án" required>
          {isNewPatientWorkflow ? (
            <input readOnly value={selectedRecordText(form, medicalRecords)} />
          ) : (
            <SuggestionInput
              value={selectedRecordText(form, medicalRecords)}
              options={medicalRecords}
              placeholder="Nhập tên bệnh nhân"
              emptyText="Không tìm thấy hồ sơ phù hợp"
              getLabel={recordLabel}
              getDescription={recordDescription}
              onChange={(value) => {
                set('record_text', value)
                set('record_id', '')
              }}
              onSelect={(record) => {
                set('record_id', record.record_id)
                set('record_text', recordLabel(record))
              }}
            />
          )}
          {fieldErrors.record_id && <div className="form-error">{fieldErrors.record_id}</div>}
        </Field>
        {(currentUnderlyingDiseaseText || currentAllergyText || allergyHits.length > 0) && (
          <div className="prescription-safety-alert">
            <strong>Cảnh báo bệnh nền và dị ứng</strong>
            {currentUnderlyingDiseaseText && <span>Bệnh nền: {currentUnderlyingDiseaseText}</span>}
            {currentAllergyText && <span>Dị ứng: {currentAllergyText}</span>}
            {allergyHits.length > 0 && (
              <span className="danger-text">
                Thuốc cần kiểm tra dị ứng: {allergyHits.join(', ')}
              </span>
            )}
          </div>
        )}
        {fieldErrors.allergy && <div className="form-error">{fieldErrors.allergy}</div>}
        <Field label="Ngày kê toa" required>
          <div className={fieldErrors.start_date ? 'field-control-wrap has-error' : 'field-control-wrap'}>
            <input
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              value={form.start_date || ''}
              aria-invalid={Boolean(fieldErrors.start_date)}
              onChange={(event) => changeStartDate(event.target.value)}
            />
            {fieldErrors.start_date && (
              <span className="field-error-mark" aria-label={fieldErrors.start_date}>
                !
              </span>
            )}
          </div>
        </Field>
        <Field label="Số ngày dùng" required>
          <div
            className={
              fieldErrors.duration_days || fieldErrors.end_date
                ? 'field-control-wrap has-error'
                : 'field-control-wrap'
            }
          >
            <input
              type="number"
              min="1"
              step="1"
              value={form.duration_days || ''}
              placeholder="Ví dụ: 7"
              aria-invalid={Boolean(fieldErrors.duration_days || fieldErrors.end_date)}
              onChange={(event) => changeDurationDays(event.target.value)}
            />
            {(fieldErrors.duration_days || fieldErrors.end_date) && (
              <span
                className="field-error-mark"
                aria-label={fieldErrors.duration_days || fieldErrors.end_date}
              >
                !
              </span>
            )}
          </div>
        </Field>
        <Field label="Trạng thái">
          <input readOnly value="Đang sử dụng" />
        </Field>
        {isEdit && (
          <Field label="Lý do chỉnh thuốc" required>
            <div className={fieldErrors.edit_reason ? 'field-control-wrap has-error' : 'field-control-wrap'}>
              <textarea
                value={form.edit_reason || ''}
                placeholder="Nhập lý do chỉnh toa thuốc"
                aria-invalid={Boolean(fieldErrors.edit_reason)}
                onChange={(event) => set('edit_reason', event.target.value)}
              />
              {fieldErrors.edit_reason && (
                <span className="field-error-mark" aria-label={fieldErrors.edit_reason}>
                  !
                </span>
              )}
            </div>
          </Field>
        )}
      </FormSection>

      {!medicineStepOpen ? (
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Hủy
          </button>
          <button type="button" className="primary-button" onClick={openMedicineStep}>
            OK
          </button>
        </div>
      ) : (
        <section className="form-section">
          <div className="panel-heading">
            <h2>Thuốc trong toa</h2>
          </div>

          <div className="prescription-item prescription-entry-item">
            <div className="form-grid">
              <Field label="Thuốc" required>
                <SuggestionInput
                  value={selectedMedicineText(draftDetail, medicines)}
                  options={medicines}
                  placeholder="Nhập tên thuốc"
                  emptyText="Chưa có thuốc phù hợp"
                  getLabel={medicineLabel}
                  getDescription={medicineDescription}
                  onChange={(value) =>
                    updateDraftDetailFields({ medicine_text: value, medicine_id: '' })
                  }
                  onSelect={(medicine) =>
                    updateDraftDetailFields({
                      medicine_id: medicine.medicine_id,
                      medicine_text: medicineLabel(medicine),
                    })
                  }
                />
                {fieldErrors.draftDetail?.medicine_id && (
                  <div className="form-error">{fieldErrors.draftDetail.medicine_id}</div>
                )}
              </Field>
              <Field label="Liều lượng" required>
                <div
                  className={
                    fieldErrors.draftDetail?.dosage
                      ? 'field-control-wrap has-error'
                      : 'field-control-wrap'
                  }
                >
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.1"
                    step="0.1"
                    value={draftDetail.dosage || ''}
                    placeholder="Ví dụ: 1"
                    aria-invalid={Boolean(fieldErrors.draftDetail?.dosage)}
                    onChange={(event) => updateDraftDetail('dosage', event.target.value)}
                  />
                  {fieldErrors.draftDetail?.dosage && (
                    <span className="field-error-mark" aria-label={fieldErrors.draftDetail.dosage}>
                      !
                    </span>
                  )}
                </div>
              </Field>
              <Field label="Đơn vị">
                <input
                  readOnly
                  value={draftDetail.medicine_id ? medicineUnit(draftDetail, medicines) : ''}
                  placeholder="Tự lấy từ thuốc"
                />
              </Field>
              <Field label="Tần suất" required>
                <select
                  value={draftDetail.frequency_type_id || ''}
                  onChange={(event) => updateDraftDetail('frequency_type_id', event.target.value)}
                >
                  <option value="">Chọn tần suất</option>
                  {frequencyTypes.map((frequency) => (
                    <option key={frequencyId(frequency)} value={frequencyId(frequency)}>
                      {frequencyLabel(frequency)}
                    </option>
                  ))}
                </select>
                {fieldErrors.draftDetail?.frequency_type_id && (
                  <div className="form-error">{fieldErrors.draftDetail.frequency_type_id}</div>
                )}
              </Field>
              <Field label="Tổng thuốc dùng">
                <input
                  readOnly
                  value={detailQuantityText(draftDetail)}
                  placeholder="Tự tính sau khi nhập đủ ngày, lượng/lần và tần suất"
                />
              </Field>
              <Field label="Thời điểm uống">
                <CheckboxOptionGroup
                  options={mealTimes}
                  value={draftDetail.meal_time_id || ''}
                  getValue={(mealTime) => mealTime.meal_time_id}
                  getLabel={mealLabel}
                  emptyText="Chưa có thời điểm phù hợp"
                  onChange={(value, mealTime) =>
                    updateDraftDetailFields({
                      meal_time_id: value,
                      meal_time_text: value ? mealLabel(mealTime) : '',
                    })
                  }
                />
              </Field>
              <Field label="Ghi chú">
                <textarea
                  value={draftDetail.note || ''}
                  onChange={(event) => updateDraftDetail('note', event.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="prescription-entry-actions">
            {fieldErrors.draftDetail?.quantity && (
              <div className="form-error">{fieldErrors.draftDetail.quantity}</div>
            )}
            <button type="button" className="secondary-button" onClick={addDraftDetail}>
              <Plus size={16} /> Tiếp - thêm thuốc khác
            </button>
          </div>

          {form.details.length > 0 && (
            <div className="prescription-added-list">
              {form.details.map((detail, index) => (
                <div className="prescription-added-item" key={detail.prescription_detail_id || index}>
                  <div>
                    <strong>{selectedMedicineText(detail, medicines) || 'Thuốc đã chọn'}</strong>
                    <span>
                      {[
                        detailDosageText(detail),
                        selectedFrequencyText(detail, frequencyTypes),
                        selectedMealText(detail, mealTimes),
                        detailQuantityText(detail) ? `Tổng dùng: ${detailQuantityText(detail)}` : '',
                      ]
                        .filter(Boolean)
                        .join(' - ') || 'Chưa có hướng dẫn'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="icon-button danger-text"
                    title="Bỏ thuốc"
                    onClick={() => removeDetail(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {medicineStepOpen && (
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Hủy
          </button>
          <button className="primary-button" disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu toa thuốc'}
          </button>
        </div>
      )}
    </form>
  )
}
