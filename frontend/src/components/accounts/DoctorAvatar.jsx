import { useState } from 'react'
import { UserRound } from 'lucide-react'
import { API_BASE_URL } from '../../api/client'

function resolveAvatarUrl(avatar) {
  if (!avatar) return ''
  if (/^(https?:|data:|blob:)/i.test(avatar)) return avatar

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '')
  return `${apiOrigin}/${avatar.replace(/^\//, '')}`
}

export default function DoctorAvatar({ avatar, name, size = 'large' }) {
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
