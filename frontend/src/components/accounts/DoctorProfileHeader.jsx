import { Pencil } from 'lucide-react'

export default function DoctorProfileHeader({ onEdit }) {
  return (
    <section className="mc-list-hero">
      <div>
        <h1>Hồ sơ bác sĩ</h1>
      </div>
      <button type="button" className="primary-button" onClick={onEdit}>
        <Pencil size={17} /> Cập nhật hồ sơ
      </button>
    </section>
  )
}
