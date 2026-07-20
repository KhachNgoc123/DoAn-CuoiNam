import Field from '../ui/Field'
import FormSection from '../ui/FormSection'

import AddressField from './AddressField'
import UnderlyingDiseaseField from "./UnderlyingDiseaseField"
import AllergyField from "./AllergyField"

import usePatientForm from '../../hooks/usePatientForm'
import {
    normalizeFullName
} from '../../utils/patientValidation'

export default function PatientForm({
    initialValue = {},
    loading,
    onSubmit,
    onCancel
}) {


const {
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

} = usePatientForm({
    initialValue,
    loading,
    onSubmit,
    onCancel
})
const genderOptions = [
    {
        value: 'Nam',
        label: 'Nam'
    },
    {
        value: 'Nữ',
        label: 'Nữ'
    }
]
  
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
        {/* //bệnh nền  */}
      <UnderlyingDiseaseField
    value={form.underlying_disease}
    suggestions={underlyingDiseaseSuggestions}
    open={underlyingDiseaseOpen}
    inputRef={underlyingDiseaseInputRef}
    suggestionRefs={underlyingDiseaseSuggestionRefs}
    set={(value) => set("underlying_disease", value)}
    setOpen={setUnderlyingDiseaseOpen}
    handleSuggestionInputKeyDown={handleSuggestionInputKeyDown}
    handleSuggestionKeyDown={handleSuggestionKeyDown}
    keepSuggestionsOpenOnInternalFocus={
        keepSuggestionsOpenOnInternalFocus
    }
    chooseSuggestion={chooseUnderlyingDiseaseSuggestion}
/>
{/* //dị ứng */}
<AllergyField
  value={form.allergy}
  suggestions={allergySuggestions}
  open={allergyOpen}
  inputRef={allergyInputRef}
  suggestionRefs={allergySuggestionRefs}
  set={(value) => set("allergy", value)}
  setOpen={setAllergyOpen}
  handleSuggestionInputKeyDown={handleSuggestionInputKeyDown}
  handleSuggestionKeyDown={handleSuggestionKeyDown}
  keepSuggestionsOpenOnInternalFocus={
    keepSuggestionsOpenOnInternalFocus
  }
  chooseSuggestion={chooseAllergySuggestion}
/>
       
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
