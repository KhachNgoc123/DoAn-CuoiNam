/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { useState } from 'react'
import { UserRound } from 'lucide-react'
import { API_BASE_URL } from '../../api/client'

function resolveAvatarUrl(avatar) {
  if (!avatar) return ''
  if (/^(https?:|data:|blob:)/i.test(avatar)) return avatar

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '')
  return `${apiOrigin}/${avatar.replace(/^\//, '')}`
}

/**
 * Hiển thị component DoctorAvatar trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.avatar Giá trị avatar được dùng để render hoặc xử lý tương tác.
 * @param {*} props.name Giá trị name được dùng để render hoặc xử lý tương tác.
 * @param {*} props.size Giá trị size được dùng để render hoặc xử lý tương tác.
 */
export default function DoctorAvatar({ avatar, name, size = 'large' }) {
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [failedUrl, setFailedUrl] = useState('')
  const imageUrl = resolveAvatarUrl(avatar)

  const initials = (name || 'Bác sĩ')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <div
      className={`doctor-avatar doctor-avatar-${size}`}
      aria-label={`Ảnh đại diện ${name || 'bác sĩ'}`}
    >
      {imageUrl && failedUrl !== imageUrl ? (
        <img
          src={imageUrl}
          alt={`Ảnh đại diện ${name || 'bác sĩ'}`}
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <span className="doctor-avatar-fallback" aria-hidden="true">
          {initials || <UserRound size={size === 'small' ? 18 : 34} />}
        </span>
      )}
    </div>
  )
}
