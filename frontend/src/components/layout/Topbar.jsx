import { useLocation } from 'react-router-dom'
import DoctorAvatar from '../accounts/DoctorAvatar'
import { menuItems } from './menuItems'

function findCurrentMenuItem(pathname) {
  if (pathname === '/patients') return { label: 'Bệnh nhân' }
  if (pathname.startsWith('/patients/')) return { label: 'Chi tiết bệnh nhân' }
  if (pathname === '/medical-records') return { label: 'Hồ sơ bệnh án' }
  if (pathname.startsWith('/medical-records/')) return { label: 'Chi tiết hồ sơ' }
  if (pathname === '/schedules') return { label: 'Lịch uống thuốc' }
  if (pathname.startsWith('/schedules/')) return { label: 'Chi tiết lịch uống' }
  if (pathname === '/') return menuItems[0]

  return (
    menuItems
      .filter((item) => item.to !== '/' && pathname.startsWith(item.to))
      .sort((a, b) => b.to.length - a.to.length)[0] || menuItems[0]
  )
}

export default function Topbar({ user }) {
  const location = useLocation()
  const currentMenuItem =
    location.pathname === '/prescriptions' && location.state?.viewPrescriptionId
      ? { label: 'Chi tiết đơn thuốc' }
      : location.pathname === '/health-metrics' && location.state?.healthView === 'detail'
        ? { label: 'Chi tiết theo dõi' }
        : location.pathname === '/health-metrics' && location.state?.healthView === 'alerts'
          ? { label: 'Cảnh báo sức khỏe' }
      : findCurrentMenuItem(location.pathname)

  return (
    <header className="topbar mc-topbar">
      <strong className="mc-topbar-title">{currentMenuItem.label}</strong>
      <div className="mc-doctor-pill">
        <DoctorAvatar avatar={user?.avatar} name={user?.full_name} size="small" />
        <span>{user?.full_name || 'Bác sĩ'}</span>
      </div>
    </header>
  )
}
