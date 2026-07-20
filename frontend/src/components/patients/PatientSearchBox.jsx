/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function patientLabel(patient) {
  if (!patient) return ''
  const code = `BN-${String(patient.patient_id).padStart(3, '0')}`
  return [patient.full_name, code, patient.phone].filter(Boolean).join(' - ')
}

export default function PatientSearchBox({
  patients,
  value,
  queryValue,
  onSelect,
  onQueryChange,
  placeholder = 'Tìm bệnh nhân trong hồ sơ bệnh án theo tên, số điện thoại hoặc mã',
}) {
  const selectedPatient = patients.find((patient) => String(patient.patient_id) === String(value))
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (queryValue !== undefined) return
    setQuery(patientLabel(selectedPatient))
  }, [queryValue, selectedPatient])

  useEffect(() => {
    if (queryValue === undefined) return
    setQuery(queryValue || '')
  }, [queryValue])

  const matches = useMemo(() => {
    const keyword = normalize(query.trim())
    if (!keyword) return []

    return patients
      .filter((patient) =>
        normalize(`${patient.full_name} ${patient.phone || ''} ${patient.patient_id}`).includes(
          keyword,
        ),
      )
      .slice(0, 8)
  }, [patients, query])

  function changeQuery(nextQuery) {
    setQuery(nextQuery)
    onQueryChange?.(nextQuery)
    setOpen(true)
    if (!nextQuery.trim() || selectedPatient) {
      onSelect(null)
    }
  }

  function choose(patient) {
    onSelect(patient)
    setQuery(patientLabel(patient))
    setOpen(false)
  }

  function clear() {
    setQuery('')
    onQueryChange?.('')
    setOpen(false)
    onSelect(null)
  }

  return (
    <div className="patient-search-box">
      <div className="patient-search-input">
        <Search size={17} />
        <input
          value={query}
          placeholder={placeholder}
          aria-label="Tìm bệnh nhân trong hồ sơ bệnh án"
          onFocus={() => setOpen(Boolean(query.trim()))}
          onChange={(event) => changeQuery(event.target.value)}
        />
        {query && (
          <button type="button" aria-label="Xóa bệnh nhân đã chọn" onClick={clear}>
            <X size={16} />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="patient-search-results" role="listbox">
          {matches.length ? (
            matches.map((patient) => (
              <button
                type="button"
                key={patient.patient_id}
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(patient)}
              >
                <strong>{patient.full_name}</strong>
                <span>
                  BN-{String(patient.patient_id).padStart(3, '0')}
                  {patient.phone ? ` - ${patient.phone}` : ''}
                </span>
              </button>
            ))
          ) : (
            <div className="patient-search-empty">Không tìm thấy bệnh nhân phù hợp</div>
          )}
        </div>
      )}
    </div>
  )
}
