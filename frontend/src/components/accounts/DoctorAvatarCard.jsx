/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { ImagePlus } from 'lucide-react'

function doctorInitials(profile) {
  const name = String(profile?.full_name || '').trim()
  if (!name) return 'BS'
  const parts = name.split(/\s+/)
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase()
}

/**
 * Hiển thị component DoctorAvatarCard trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.profile Giá trị profile được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onEdit Giá trị onEdit được dùng để render hoặc xử lý tương tác.
 */
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
