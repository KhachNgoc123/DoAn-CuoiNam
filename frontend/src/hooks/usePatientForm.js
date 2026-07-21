/**
 * Hook qu?n l? to?n b? d? li?u v? x? l? submit c?a form b?nh nh?n.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { getPatientSuggestions } from '../api/patientApi'
import { getProvinceDetail, getProvinces } from '../api/provincesApi'
import { toCompactDateInputValue } from '../utils/formatters'
import { normalizePhoneInput } from '../utils/phone'
import {
  formatBirthDateInput,
  normalizeGender,
  validatePatient,
} from '../utils/patientValidation'
import {
  addressDetailWithoutLocations,
  applyListSuggestion,
  buildAddressValue,
  currentSuggestionToken,
  extractWards,
  findLocationInAddress,
  normalizeSearch,
} from '../utils/patientHelpers'

export default function usePatientForm({
  initialValue = {},
  onSubmit,
}) {
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [form, setForm] = useState({
    full_name: initialValue.full_name || '',
    gender:
      normalizeGender(initialValue.gender) ||
      (initialValue.patient_id ? '' : 'Nam'),
    date_of_birth: formatBirthDateInput(
      toCompactDateInputValue(initialValue.date_of_birth),
    ),
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

  const [addressDetail, setAddressDetail] = useState(
    initialValue.address || '',
  )
  const [addressLoading, setAddressLoading] = useState(false)

  const [patientSuggestions, setPatientSuggestions] = useState({
    chronic_diseases: [],
    allergies: [],
  })

  const [underlyingDiseaseOpen, setUnderlyingDiseaseOpen] =
    useState(false)
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

  function set(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))

    setFieldErrors((current) => ({
      ...current,
      [key]: '',
    }))
  }

  // Lấy danh sách tỉnh/thành phố
  useEffect(() => {
    getProvinces()
      .then((data) => {
        setProvinces(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setProvinces([])
      })
  }, [])

  // Lấy danh sách bệnh nền và dị ứng
  useEffect(() => {
    getPatientSuggestions()
      .then((data) => {
        setPatientSuggestions({
          chronic_diseases: data.chronic_diseases || [],
          allergies: data.allergies || [],
        })
      })
      .catch(() => {
        setPatientSuggestions({
          chronic_diseases: [],
          allergies: [],
        })
      })
  }, [])

  // Khôi phục tỉnh, phường/xã và địa chỉ khi chỉnh sửa bệnh nhân
  useEffect(() => {
    if (
      addressHydratedRef.current ||
      !initialValue.address ||
      !provinces.length
    ) {
      return
    }

    let active = true

    const timer = window.setTimeout(async () => {
      if (!active) return

      const province = findLocationInAddress(
        provinces,
        initialValue.address,
      )

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
        const ward = findLocationInAddress(
          nextWards,
          initialValue.address,
        )

        const nextAddressDetail = addressDetailWithoutLocations(
          initialValue.address,
          province.name,
          ward ? [ward] : nextWards,
        )

        setWards(nextWards)
        setSelectedWard(ward || null)
        setWardQuery(ward?.name || '')
        setAddressDetail(nextAddressDetail)

        set(
          'address',
          buildAddressValue(
            province,
            ward,
            nextAddressDetail,
          ),
        )
      } catch {
        if (active) {
          setWards([])
        }
      } finally {
        if (active) {
          setAddressLoading(false)
        }
      }
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [initialValue.address, provinces])

  const provinceSuggestions = useMemo(() => {
    const keyword = normalizeSearch(provinceQuery)

    return provinces
      .filter(
        (province) =>
          !keyword ||
          normalizeSearch(province.name).includes(keyword),
      )
      .slice(0, 8)
  }, [provinceQuery, provinces])

  const wardSuggestions = useMemo(() => {
    const keyword = normalizeSearch(wardQuery)

    return wards
      .filter(
        (ward) =>
          !keyword ||
          normalizeSearch(ward.name).includes(keyword),
      )
      .slice(0, 8)
  }, [wardQuery, wards])

  const underlyingDiseaseSuggestions = useMemo(() => {
    const keyword = normalizeSearch(
      currentSuggestionToken(form.underlying_disease),
    )

    const selectedValues = new Set(
      String(form.underlying_disease || '')
        .split(/[,;\n]/)
        .map((value) => normalizeSearch(value.trim()))
        .filter(Boolean),
    )

    return patientSuggestions.chronic_diseases
      .filter((item) => {
        const key = normalizeSearch(item)

        return (
          key &&
          !selectedValues.has(key) &&
          (!keyword || key.includes(keyword))
        )
      })
      .slice(0, 8)
  }, [
    form.underlying_disease,
    patientSuggestions.chronic_diseases,
  ])

  const allergySuggestions = useMemo(() => {
    const keyword = normalizeSearch(
      currentSuggestionToken(form.allergy),
    )

    const selectedValues = new Set(
      String(form.allergy || '')
        .split(/[,;\n]/)
        .map((value) => normalizeSearch(value.trim()))
        .filter(Boolean),
    )

    return patientSuggestions.allergies
      .filter((item) => {
        const key = normalizeSearch(item)

        return (
          key &&
          !selectedValues.has(key) &&
          (!keyword || key.includes(keyword))
        )
      })
      .slice(0, 8)
  }, [form.allergy, patientSuggestions.allergies])

  function changePhone(value) {
    const phone = normalizePhoneInput(value)

    setForm((current) => ({
      ...current,
      phone,
    }))

    setFieldErrors((current) => ({
      ...current,
      phone:
        phone.length > 0 && phone.length < 10
          ? 'Số điện thoại chưa đủ 10 chữ số.'
          : '',
    }))
  }

  function changeBirthDate(value) {
    set(
      'date_of_birth',
      formatBirthDateInput(value),
    )
  }

  function changeAddressDetail(value) {
    setAddressDetail(value)

    set(
      'address',
      buildAddressValue(
        selectedProvince,
        selectedWard,
        value,
      ),
    )
  }

  function changeProvinceQuery(value) {
    setProvinceQuery(value)
    setProvinceOpen(true)

    if (
      selectedProvince &&
      normalizeSearch(value) !==
        normalizeSearch(selectedProvince.name)
    ) {
      setSelectedProvince(null)
      setSelectedWard(null)
      setWardQuery('')
      setWards([])
    }

    set(
      'address',
      buildAddressValue(value, null, addressDetail),
    )
  }

  function changeWardQuery(value) {
    setWardQuery(value)
    setWardOpen(true)

    if (
      selectedWard &&
      normalizeSearch(value) !==
        normalizeSearch(selectedWard.name)
    ) {
      setSelectedWard(null)
    }

    set(
      'address',
      buildAddressValue(
        selectedProvince,
        value,
        addressDetail,
      ),
    )
  }

  function keepSuggestionsOpenOnInternalFocus(
    event,
    close,
  ) {
    const nextElement = event.relatedTarget

    if (
      nextElement &&
      event.currentTarget.contains(nextElement)
    ) {
      return
    }

    const container = event.currentTarget

    window.setTimeout(() => {
      if (
        !container.contains(
          window.document.activeElement,
        )
      ) {
        close()
      }
    }, 120)
  }

  function focusSuggestion(refs, index) {
    refs.current[index]?.focus()
  }

  // Hàm handleSuggestionInputKeyDown xử lý sự kiện người dùng trên giao diện.
  function handleSuggestionInputKeyDown(
    event,
    suggestions,
    refs,
  ) {
    if (
      event.key === 'Tab' &&
      !event.shiftKey &&
      suggestions.length
    ) {
      event.preventDefault()
      focusSuggestion(refs, 0)
    }
  }

  // Hàm handleSuggestionKeyDown xử lý sự kiện người dùng trên giao diện.
  function handleSuggestionKeyDown(
    event,
    index,
    suggestions,
    refs,
    inputRef,
    close,
  ) {
    if (!suggestions.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()

      focusSuggestion(
        refs,
        (index + 1) % suggestions.length,
      )
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()

      focusSuggestion(
        refs,
        (index - 1 + suggestions.length) %
          suggestions.length,
      )
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

    set(
      'address',
      buildAddressValue(
        province,
        null,
        addressDetail,
      ),
    )

    setProvinceOpen(false)

    if (!province) {
      setAddressLoading(false)
      return
    }

    setAddressLoading(true)

    try {
      const detail = await getProvinceDetail(
        province.code,
      )

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

    set(
      'address',
      buildAddressValue(
        selectedProvince,
        ward,
        addressDetail,
      ),
    )

    setWardOpen(false)
  }

  function chooseUnderlyingDiseaseSuggestion(
    suggestion,
  ) {
    set(
      'underlying_disease',
      applyListSuggestion(
        form.underlying_disease,
        suggestion,
      ),
    )

    setUnderlyingDiseaseOpen(false)
    underlyingDiseaseInputRef.current?.focus()
  }

  function chooseAllergySuggestion(suggestion) {
    set(
      'allergy',
      applyListSuggestion(
        form.allergy,
        suggestion,
      ),
    )

    setAllergyOpen(false)
    allergyInputRef.current?.focus()
  }

  function submit(event) {
    event.preventDefault()

    const result = validatePatient(form)

    setFieldErrors(result.errors)

    if (!result.isValid) return

    onSubmit({
      full_name: result.fullName,
      gender: form.gender,
      date_of_birth: result.birthDate,
      phone: result.phone,
      address: result.address,
      underlying_disease:
        form.underlying_disease.trim() || null,
      allergy: form.allergy.trim() || null,
    })
  }

  return {
    form,
    fieldErrors,

    provinces,
    wards,

    provinceQuery,
    wardQuery,

    provinceOpen,
    wardOpen,

    addressDetail,
    addressLoading,

    selectedProvince,
    selectedWard,

    patientSuggestions,

    underlyingDiseaseSuggestions,
    allergySuggestions,

    provinceInputRef,
    wardInputRef,

    underlyingDiseaseInputRef,
    allergyInputRef,

    provinceSuggestionRefs,
    wardSuggestionRefs,

    underlyingDiseaseSuggestionRefs,
    allergySuggestionRefs,

    set,

    changePhone,
    changeBirthDate,
    changeAddressDetail,

    changeProvinceQuery,
    changeWardQuery,

    chooseProvince,
    chooseWard,

    chooseUnderlyingDiseaseSuggestion,
    chooseAllergySuggestion,

    handleSuggestionInputKeyDown,
    handleSuggestionKeyDown,

    keepSuggestionsOpenOnInternalFocus,

    submit,

    setProvinceOpen,
    setWardOpen,

    setUnderlyingDiseaseOpen,
    setAllergyOpen,

    provinceSuggestions,
    wardSuggestions,

    underlyingDiseaseOpen,
    allergyOpen,
  }
}