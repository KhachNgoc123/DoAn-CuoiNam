import { RotateCcw, Search } from 'lucide-react'
import PatientSearchBox from '../patients/PatientSearchBox'

export default function MedicalRecordFilterBar({
  params,
  patients,
  statusOptions,
  onParamsChange,
  onSearch,
  onClear,
}) {
  return (
    <section className="mc-record-filter-card">
      <label>
        <span>Từ khóa</span>
        <div className="mc-filter-input">
          <Search size={17} />
          <PatientSearchBox
            patients={patients}
            value={params.patient_id || ''}
            queryValue={params.search || ''}
            onSelect={(patient) =>
              onParamsChange({ patient_id: patient?.patient_id || '', search: '', page: 1, per_page: 20 })
            }
            onQueryChange={(search) => onParamsChange({ search, patient_id: '', page: 1, per_page: 20 })}
            placeholder="Mã hồ sơ, bệnh nhân, SĐT"
          />
        </div>
      </label>
      <label>
        <span>Trạng thái</span>
        <select
          value={params.status || ''}
          onChange={(event) => onParamsChange({ status: event.target.value, page: 1, per_page: 20 })}
        >
          {statusOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>      
      <label>
        <span>Từ ngày</span>
        <input
          type="date"
          value={params.from_date || ''}
          onChange={(event) => onParamsChange({ from_date: event.target.value, visit_date: '', page: 1, per_page: 20 })}
        />
      </label>
      <label>
        <span>Đến ngày</span>
        <input
          type="date"
          value={params.to_date || ''}
          onChange={(event) => onParamsChange({ to_date: event.target.value, visit_date: '', page: 1, per_page: 20 })}
        />
      </label>
      <button type="button" className="mc-search-button" onClick={onSearch}>
        <Search size={17} /> Tìm kiếm
      </button>
      <button type="button" className="secondary-button" onClick={onClear}>
        <RotateCcw size={15} /> Làm mới
      </button>
    </section>
  )
}
