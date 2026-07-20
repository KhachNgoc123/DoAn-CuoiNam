import {
  Activity,
  BellRing,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Pill,
  UserCog,
  Users,
} from 'lucide-react'

export const menuItems = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/patients', label: 'Bệnh nhân', icon: Users },
  { to: '/medical-records', label: 'Hồ sơ bệnh án', icon: ClipboardList },
  { to: '/prescriptions', label: 'Đơn thuốc', icon: FileText },
  { to: '/medicines', label: 'Quản lý thuốc', icon: Pill },
  { to: '/schedules', label: 'Lịch uống & nhắc thuốc', icon: BellRing },
  { to: '/health-metrics', label: 'Theo dõi sức khỏe', icon: Activity },
  { to: '/patient-feedbacks', label: 'Phản hồi', icon: MessageSquareText },
  { to: '/accounts', label: 'Hồ sơ bác sĩ', icon: UserCog },
]
