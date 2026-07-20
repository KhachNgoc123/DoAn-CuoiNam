import { FileSpreadsheet, Plus } from 'lucide-react'

export default function MedicalRecordListHeader({ onExport, onCreate }) {
  return (
    <section className="mc-list-hero">
      <div>
        <h1>Quản lý hồ sơ bệnh án</h1>
      </div>
      <button type="button" className="secondary-button prescription-export-button" onClick={onExport}>
        <FileSpreadsheet size={17} /> Excel
      </button>
      <button className="primary-button mc-add-button" onClick={onCreate}>
        <Plus size={18} /> Thêm hồ sơ bệnh án
      </button>
    </section>
  )
}
