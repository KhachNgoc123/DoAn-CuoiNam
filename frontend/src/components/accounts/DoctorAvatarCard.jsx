import { ImagePlus } from 'lucide-react'

function doctorInitials(profile) {
  const name = String(profile?.full_name || '').trim()
  if (!name) return 'BS'
  const parts = name.split(/\s+/)
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase()
}

export default function DoctorAvatarCard({ profile, onEdit }) {
  return (
    <article className="doctor-avatar-modern-card">
      <div className="doctor-initials-avatar">{doctorInitials(profile)}</div>
      <strong>{profile.full_name || 'Chưa cập nhật họ tên'}</strong>
      <span>{profile.specialty || 'Chưa cập nhật chuyên khoa'}</span>
      <button type="button" className="secondary-button" onClick={onEdit}>
        <ImagePlus size={60} /> Thay đổi ảnh đại diện
      </button>
    </article>
  )
}
