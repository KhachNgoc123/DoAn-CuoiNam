import { useEffect, useMemo, useRef, useState } from 'react'
import Field from '../ui/Field'
import FormSection from '../ui/FormSection'
import { getProvinceDetail, getProvinces } from '../../api/provincesApi'
import { getList } from '../../api/resources'
import { toApiDateValue, toCompactDateInputValue } from '../../utils/formatters'
import { isValidPhone, normalizePhoneInput } from '../../utils/phone'
//địa chỉ
import AddressField from './AddressField'
import useAddress from '../../hooks/useAddress'

import {
  normalizeFullName,
  normalizeGender,
  normalizeAddressValue,
  validatePatient,
  formatBirthDateInput,
  isFutureApiDate
} from '../../utils/patientValidation'

const genderOptions = [
  { value: 'Nam', label: 'Nam' },
  { value: 'Nữ', label: 'Nữ' },
]



function normalizeSearch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}


function locationName(location) {
  if (!location) return ''
  return typeof location === 'string' ? location : location.name
}

function buildAddressValue(province, ward, detail) {
  return [locationName(province), locationName(ward), detail]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(', ')
}

function extractWards(provinceDetail) {
  if (Array.isArray(provinceDetail?.wards)) return provinceDetail.wards
  if (Array.isArray(provinceDetail?.districts)) {
    return provinceDetail.districts.flatMap((district) => district.wards || [])
  }
  return []
}

function findLocationInAddress(locations, address) {
  const addressKey = normalizeSearch(address)
  return locations.find((location) => addressKey.includes(normalizeSearch(location.name)))
}

function addressDetailWithoutLocations(address, provinceName, wards = []) {
  const locationKeys = new Set(
    [provinceName, ...wards.map((ward) => ward.name)].map(normalizeSearch).filter(Boolean),
  )
  return String(address || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item && !locationKeys.has(normalizeSearch(item)))
    .join(', ')
}




function currentSuggestionToken(value) {
  return String(value || '').split(/[,;\n]/).pop().trim()
}

function applyListSuggestion(value, suggestion) {
  const text = String(value || '')
  const match = text.match(/^(.*?)([^,;\n]*)$/s)
  return `${match?.[1] || ''}${suggestion}`
}

export default function PatientForm({ initialValue = {}, loading, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    full_name: initialValue.full_name || '',
    gender: normalizeGender(initialValue.gender) || (initialValue.patient_id ? '' : 'Nam'),
    date_of_birth: formatBirthDateInput(toCompactDateInputValue(initialValue.date_of_birth)),
    phone: initialValue.phone || '',
    address: initialValue.address || '',
    underlying_disease: initialValue.underlying_disease || '',
    allergy: initialValue.allergy || '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [provinces, setProvinces] = useState([])
  const [wards, setWards] = useState([])
  const [selectedProvince, setSelectedProvince] = useState(null)
  const [selectedWard, setSelectedWard] = useState(null)
  const [provinceQuery, setProvinceQuery] = useState('')
  const [wardQuery, setWardQuery] = useState('')
  const [provinceOpen, setProvinceOpen] = useState(false)
  const [wardOpen, setWardOpen] = useState(false)
  const [addressDetail, setAddressDetail] = useState(initialValue.address || '')
  const [addressLoading, setAddressLoading] = useState(false)
  const [patientSuggestions, setPatientSuggestions] = useState({
    chronic_diseases: [],
    allergies: [],
  })
  const [underlyingDiseaseOpen, setUnderlyingDiseaseOpen] = useState(false)
  const [allergyOpen, setAllergyOpen] = useState(false)
  const addressHydratedRef = useRef(false)
  const provinceInputRef = useRef(null)
  const wardInputRef = useRef(null)
  const underlyingDiseaseInputRef = useRef(null)
  const allergyInputRef = useRef(null)
  const provinceSuggestionRefs = useRef([])
  const wardSuggestionRefs = useRef([])
  const underlyingDiseaseSuggestionRefs = useRef([])
  const allergySuggestionRefs = useRef([])

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
  }

  useEffect(() => {
    getProvinces()
      .then((data) => setProvinces(Array.isArray(data) ? data : []))
      .catch(() => setProvinces([]))
  }, [])

  useEffect(() => {
    getList('/patient-suggestions')
      .then((result) =>
        setPatientSuggestions({
          chronic_diseases: Array.isArray(result.raw?.chronic_diseases)
            ? result.raw.chronic_diseases
            : [],
          allergies: Array.isArray(result.raw?.allergies) ? result.raw.allergies : [],
        }),
      )
      .catch(() => setPatientSuggestions({ chronic_diseases: [], allergies: [] }))
  }, [])

  const provinceSuggestions = useMemo(() => {
    const keyword = normalizeSearch(provinceQuery)
    return provinces
      .filter((province) => !keyword || normalizeSearch(province.name).includes(keyword))
      .slice(0, 8)
  }, [provinceQuery, provinces])

  const wardSuggestions = useMemo(() => {
    const keyword = normalizeSearch(wardQuery)
    return wards
      .filter((ward) => !keyword || normalizeSearch(ward.name).includes(keyword))
      .slice(0, 8)
  }, [wardQuery, wards])

  const underlyingDiseaseSuggestions = useMemo(() => {
    const keyword = normalizeSearch(currentSuggestionToken(form.underlying_disease))
    const selectedValues = new Set(
      String(form.underlying_disease || '')
        .split(/[,;\n]/)
        .map((value) => normalizeSearch(value.trim()))
        .filter(Boolean),
    )
    return patientSuggestions.chronic_diseases
      .filter((item) => {
        const key = normalizeSearch(item)
        return key && !selectedValues.has(key) && (!keyword || key.includes(keyword))
      })
      .slice(0, 8)
  }, [form.underlying_disease, patientSuggestions.chronic_diseases])

  const allergySuggestions = useMemo(() => {
    const keyword = normalizeSearch(currentSuggestionToken(form.allergy))
    const selectedValues = new Set(
      String(form.allergy || '')
        .split(/[,;\n]/)
        .map((value) => normalizeSearch(value.trim()))
        .filter(Boolean),
    )
    return patientSuggestions.allergies
      .filter((item) => {
        const key = normalizeSearch(item)
        return key && !selectedValues.has(key) && (!keyword || key.includes(keyword))
      })
      .slice(0, 8)
  }, [form.allergy, patientSuggestions.allergies])

  useEffect(() => {
    if (addressHydratedRef.current || !initialValue.address || !provinces.length) return
    let active = true
    const timer = window.setTimeout(async () => {
      if (!active) return
      const province = findLocationInAddress(provinces, initialValue.address)
      addressHydratedRef.current = true
      if (!province) return
      setSelectedProvince(province)
      setSelectedWard(null)
      setProvinceQuery(province.name)
      setWardQuery('')
      setWards([])
      setAddressLoading(true)
      try {
        const detail = await getProvinceDetail(province.code)
        if (!active) return
        const nextWards = extractWards(detail)
        const ward = findLocationInAddress(nextWards, initialValue.address)
        const nextAddressDetail = addressDetailWithoutLocations(
          initialValue.address,
          province.name,
          ward ? [ward] : nextWards,
        )
        setWards(nextWards)
        setSelectedWard(ward || null)
        setWardQuery(ward?.name || '')
        setAddressDetail(nextAddressDetail)
        set('address', buildAddressValue(province, ward, nextAddressDetail))
      } catch {
        if (active) setWards([])
      } finally {
        if (active) setAddressLoading(false)
      }
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [initialValue.address, provinces])

  function changePhone(value) {
    const phone = normalizePhoneInput(value)
    setForm((current) => ({ ...current, phone }))
    setFieldErrors((current) => ({
      ...current,
      phone: phone.length > 0 && phone.length < 10 ? 'Số điện thoại chưa đủ 10 chữ số.' : '',
    }))
  }

  function changeBirthDate(value) {
    set('date_of_birth', formatBirthDateInput(value))
  }

  function changeAddressDetail(value) {
    setAddressDetail(value)
    set('address', buildAddressValue(selectedProvince, selectedWard, value))
  }

  function changeProvinceQuery(value) {
    setProvinceQuery(value)
    setProvinceOpen(true)
    if (selectedProvince && normalizeSearch(value) !== normalizeSearch(selectedProvince.name)) {
      setSelectedProvince(null)
      setSelectedWard(null)
      setWardQuery('')
      setWards([])
    }
    set('address', buildAddressValue(value, null, addressDetail))
  }

  function changeWardQuery(value) {
    setWardQuery(value)
    setWardOpen(true)
    if (selectedWard && normalizeSearch(value) !== normalizeSearch(selectedWard.name)) {
      setSelectedWard(null)
    }
    set('address', buildAddressValue(selectedProvince, value, addressDetail))
  }

  function keepSuggestionsOpenOnInternalFocus(event, close) {
    const nextElement = event.relatedTarget
    if (nextElement && event.currentTarget.contains(nextElement)) return
    const container = event.currentTarget
    window.setTimeout(() => {
      if (!container.contains(window.document.activeElement)) close()
    }, 120)
  }

  function focusSuggestion(refs, index) {
    refs.current[index]?.focus()
  }

  function handleSuggestionInputKeyDown(event, suggestions, refs) {
    if (event.key === 'Tab' && !event.shiftKey && suggestions.length) {
      event.preventDefault()
      focusSuggestion(refs, 0)
    }
  }

  function handleSuggestionKeyDown(event, index, suggestions, refs, inputRef, close) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusSuggestion(refs, (index + 1) % suggestions.length)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusSuggestion(refs, (index - 1 + suggestions.length) % suggestions.length)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      inputRef.current?.focus()
    }
  }

  async function chooseProvince(province) {
    setSelectedProvince(province)
    setSelectedWard(null)
    setProvinceQuery(province?.name || '')
    setWardQuery('')
    setWards([])
    set('address', buildAddressValue(province, null, addressDetail))
    setProvinceOpen(false)
    if (!province) {
      setAddressLoading(false)
      return
    }
    setAddressLoading(true)
    try {
      const detail = await getProvinceDetail(province.code)
      setWards(extractWards(detail))
    } catch {
      setWards([])
    } finally {
      setAddressLoading(false)
      setWardOpen(true)
      wardInputRef.current?.focus()
    }
  }

  function chooseWard(ward) {
    setSelectedWard(ward)
    setWardQuery(ward?.name || '')
    set('address', buildAddressValue(selectedProvince, ward, addressDetail))
    setWardOpen(false)
  }

  function chooseUnderlyingDiseaseSuggestion(suggestion) {
    set('underlying_disease', applyListSuggestion(form.underlying_disease, suggestion))
    setUnderlyingDiseaseOpen(false)
    underlyingDiseaseInputRef.current?.focus()
  }

  function chooseAllergySuggestion(suggestion) {
    set('allergy', applyListSuggestion(form.allergy, suggestion))
    setAllergyOpen(false)
    allergyInputRef.current?.focus()
  }

  function submit(event) {
    event.preventDefault()
    const fullName = normalizeFullName(form.full_name)
    const phone = normalizePhoneInput(form.phone)
    const birthDate = toApiDateValue(form.date_of_birth || '')
    const address = normalizeAddressValue(form.address)
    const birthDateError = !birthDate
      ? 'Ngày sinh phải nhập đúng định dạng dd/mm/yyyy.'
      : isFutureApiDate(birthDate)
        ? 'Ngày sinh không được lớn hơn ngày hiện tại.'
        : ''
    const nextErrors = {
      full_name: fullName ? '' : 'Vui lòng nhập họ tên.',
      gender: form.gender ? '' : 'Vui lòng chọn giới tính.',
      date_of_birth: birthDateError,
      phone: isValidPhone(phone) ? '' : 'Số điện thoại chưa đủ 10 chữ số.',
      address: address ? '' : 'Vui lòng nhập địa chỉ.',
    }
    //sua ở dâyd
     const result = validatePatient(form)
    setFieldErrors(result.errors)
    if (!result.isValid) return

  onSubmit({
    full_name: result.fullName,
    gender: form.gender,
    date_of_birth: result.birthDate,
    phone: result.phone,
    address: result.address,
    underlying_disease: form.underlying_disease.trim() || null,
    allergy: form.allergy.trim() || null,
  })
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      <FormSection
        title={initialValue.patient_id ? 'Chỉnh sửa thông tin bệnh nhân' : 'Thông tin bệnh nhân'}
      >
        <Field label="Họ và tên" required>
          <div className={fieldErrors.full_name ? 'field-control-wrap has-error' : 'field-control-wrap'}>
            <input
              autoFocus
              value={form.full_name}
              aria-invalid={Boolean(fieldErrors.full_name)}
              onChange={(event) => set('full_name', event.target.value)}
              onBlur={() => set('full_name', normalizeFullName(form.full_name))}
            />
            {fieldErrors.full_name && (
              <span className="field-error-mark" aria-label={fieldErrors.full_name}>
                !
              </span>
            )}
          </div>
        </Field>

        <div className="field" role="radiogroup" aria-labelledby="patient-gender-label">
          <span id="patient-gender-label">
            Giới tính
            <strong className="required-mark" aria-label="Bắt buộc">
              *
            </strong>
          </span>
          <div className="radio-card-group">
            {genderOptions.map((option) => (
              <label
                key={option.value}
                className={form.gender === option.value ? 'radio-card active' : 'radio-card'}
              >
                <input
                  type="radio"
                  name="patient-gender"
                  value={option.value}
                  checked={form.gender === option.value}
                  onChange={(event) => set('gender', event.target.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
          {fieldErrors.gender && <div className="form-error">{fieldErrors.gender}</div>}
        </div>

        <Field label="Ngày sinh" required>
          <div className={fieldErrors.date_of_birth ? 'field-control-wrap has-error' : 'field-control-wrap'}>
            <input
              inputMode="numeric"
              maxLength={10}
              placeholder="dd/mm/yyyy, ví dụ 30/10/2005"
              value={form.date_of_birth}
              aria-invalid={Boolean(fieldErrors.date_of_birth)}
              onChange={(event) => changeBirthDate(event.target.value)}
            />
            {fieldErrors.date_of_birth && (
              <span className="field-error-mark" aria-label={fieldErrors.date_of_birth}>
                !
              </span>
            )}
          </div>
        </Field>

        <div className="field phone-field">
          <span>
            Số điện thoại
            <strong className="required-mark" aria-label="Bắt buộc">
              *
            </strong>
          </span>
          <div className={fieldErrors.phone ? 'field-control-wrap has-error' : 'field-control-wrap'}>
            <input
              inputMode="numeric"
              maxLength={10}
              placeholder="Nhập 10 chữ số"
              value={form.phone}
              aria-invalid={Boolean(fieldErrors.phone)}
              onChange={(event) => changePhone(event.target.value)}
            />
            {fieldErrors.phone && (
              <span className="field-error-mark" aria-label={fieldErrors.phone}>
                !
              </span>
            )}
          </div>
        </div>

      {/* chỉnh sửa khúc này */}
        <AddressField
    fieldErrors={fieldErrors}

    provinceInputRef={provinceInputRef}
    wardInputRef={wardInputRef}

    provinceQuery={provinceQuery}
    wardQuery={wardQuery}

    provinceOpen={provinceOpen}
    wardOpen={wardOpen}

    provinceSuggestions={provinceSuggestions}
    wardSuggestions={wardSuggestions}

    provinceSuggestionRefs={provinceSuggestionRefs}
    wardSuggestionRefs={wardSuggestionRefs}

    selectedProvince={selectedProvince}

    addressLoading={addressLoading}

    addressDetail={addressDetail}

    keepSuggestionsOpenOnInternalFocus={keepSuggestionsOpenOnInternalFocus}

    handleSuggestionInputKeyDown={handleSuggestionInputKeyDown}
    handleSuggestionKeyDown={handleSuggestionKeyDown}

    changeProvinceQuery={changeProvinceQuery}
    changeWardQuery={changeWardQuery}
    changeAddressDetail={changeAddressDetail}

    chooseProvince={chooseProvince}
    chooseWard={chooseWard}

    setProvinceOpen={setProvinceOpen}
    setWardOpen={setWardOpen}
    />
        {/* //tới đây */}
      



        <Field label="Bệnh nền / tiền sử bệnh" span={2}>
          <div
            className="address-suggest-box"
            onBlur={(event) =>
              keepSuggestionsOpenOnInternalFocus(event, () => setUnderlyingDiseaseOpen(false))
            }
          >
            <textarea
              ref={underlyingDiseaseInputRef}
              value={form.underlying_disease}
              placeholder="Nhập bệnh nền, tiền sử điều trị hoặc bệnh mạn tính nếu có"
              onFocus={() => setUnderlyingDiseaseOpen(true)}
              onKeyDown={(event) =>
                handleSuggestionInputKeyDown(
                  event,
                  underlyingDiseaseSuggestions,
                  underlyingDiseaseSuggestionRefs,
                )
              }
              onChange={(event) => {
                set('underlying_disease', event.target.value)
                setUnderlyingDiseaseOpen(true)
              }}
            />
            {underlyingDiseaseOpen && (
              <div className="address-suggest-list">
                {underlyingDiseaseSuggestions.length ? (
                  underlyingDiseaseSuggestions.map((suggestion, index) => (
                    <button
                      type="button"
                      ref={(element) => {
                        underlyingDiseaseSuggestionRefs.current[index] = element
                      }}
                      key={suggestion}
                      onKeyDown={(event) =>
                        handleSuggestionKeyDown(
                          event,
                          index,
                          underlyingDiseaseSuggestions,
                          underlyingDiseaseSuggestionRefs,
                          underlyingDiseaseInputRef,
                          () => setUnderlyingDiseaseOpen(false),
                        )
                      }
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseUnderlyingDiseaseSuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))
                ) : (
                  <span>Không có bệnh nền phù hợp</span>
                )}
              </div>
            )}
          </div>
        </Field>

        <Field label="Dị ứng" span={2}>
          <div
            className="address-suggest-box"
            onBlur={(event) => keepSuggestionsOpenOnInternalFocus(event, () => setAllergyOpen(false))}
          >
            <textarea
              ref={allergyInputRef}
              value={form.allergy}
              placeholder="Dị ứng thuốc, thức ăn hoặc phản ứng từng gặp. Nếu không có có thể để trống."
              onFocus={() => setAllergyOpen(true)}
              onKeyDown={(event) =>
                handleSuggestionInputKeyDown(event, allergySuggestions, allergySuggestionRefs)
              }
              onChange={(event) => {
                set('allergy', event.target.value)
                setAllergyOpen(true)
              }}
            />
            {allergyOpen && (
              <div className="address-suggest-list">
                {allergySuggestions.length ? (
                  allergySuggestions.map((suggestion, index) => (
                    <button
                      type="button"
                      ref={(element) => {
                        allergySuggestionRefs.current[index] = element
                      }}
                      key={suggestion}
                      onKeyDown={(event) =>
                        handleSuggestionKeyDown(
                          event,
                          index,
                          allergySuggestions,
                          allergySuggestionRefs,
                          allergyInputRef,
                          () => setAllergyOpen(false),
                        )
                      }
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseAllergySuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))
                ) : (
                  <span>Không có dị ứng phù hợp</span>
                )}
              </div>
            )}
          </div>
        </Field>
      </FormSection>

      <div className="form-actions">
        <button type="button" className="secondary-button" disabled={loading} onClick={onCancel}>
          Hủy
        </button>
        <button className="primary-button" disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu bệnh nhân'}
        </button>
      </div>
    </form>
  )
}
