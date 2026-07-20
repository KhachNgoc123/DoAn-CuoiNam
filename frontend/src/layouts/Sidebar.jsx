import { NavLink, useNavigate } from 'react-router-dom'
import {
  Activity,
  ClipboardList,
  FileText,
  Heart,
  LogOut,
  Pill,
  Plus,
  Settings,
  Users,
} from 'lucide-react'
import { logout } from '../services/accountService'

const groups = [
  {
    title: 'Hệ thống',
    items: [{ to: '/', label: 'Tổng quan', icon: ClipboardList }],
  },
  {
    title: 'Điều trị',
    items: [
      { to: '/patients', label: 'Bệnh nhân', icon: Users },
      { to: '/medical-records', label: 'Hồ sơ bệnh án', icon: FileText },
      { to: '/prescriptions', label: 'Đơn thuốc', icon: Pill },
      { to: '/schedules', label: 'Lịch uống & nhắc thuốc', icon: Activity },
    ],
  },
  {
    title: 'Giám sát',
    items: [{ to: '/health-metrics', label: 'Theo dõi sức khỏe', icon: Heart }],
  },
  {
    title: 'Tài khoản',
    items: [{ to: '/accounts', label: 'Hồ sơ bác sĩ', icon: Settings }],
  },
]

export default function Sidebar({ onUserChange }) {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // Vẫn xóa phiên trên máy nếu phiên server đã hết hạn.
    }
    localStorage.removeItem('doctor_health_token')
    localStorage.removeItem('doctor_health_user')
    onUserChange?.(null)
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar mc-sidebar">
      <div className="mc-sidebar-brand">
        <span className="mc-brand-plus">
          <Plus size={24} strokeWidth={3} />
        </span>
        <strong>MEDICONTROL</strong>
      </div>

      <nav className="mc-sidebar-nav" aria-label="Menu chính">
        {groups.map((group) => (
          <section className="mc-sidebar-group" key={group.title}>
            <span className="mc-sidebar-group-title">{group.title}</span>
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </section>
        ))}
      </nav>

      <button type="button" className="mc-sidebar-logout" onClick={handleLogout}>
        <LogOut size={17} />
        <span>Đăng xuất</span>
      </button>
    </aside>
  )
}
