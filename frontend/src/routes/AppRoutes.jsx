/**
 * Khai báo toàn bộ route, kiểm tra đăng nhập và bọc layout quản trị.
 */

import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import { getMe } from '../api/authApi'
import { clearListCache, getDashboard, getList } from '../api/resources'
import LoadingState from '../components/ui/LoadingState'
import {
  PrescriptionCollectionRoute,
  PrescriptionCreateRoute,
  PrescriptionEditRoute,
  ScheduleCreateRoute,
  ScheduleCollectionRoute,
  ScheduleEditRoute,
  ScheduleMemberRoute,
} from './ResourceRouteViews'

const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'))
const PatientsPage = lazy(() => import('../pages/patients/PatientsPage'))
const PatientDetailPage = lazy(() => import('../pages/patients/PatientDetailPage'))
const MedicalRecordsPage = lazy(() => import('../pages/medical-records/MedicalRecordsPage'))
const MedicalRecordDetailPage = lazy(() => import('../pages/medical-records/MedicalRecordDetailPage'))
const PrescriptionsPage = lazy(() => import('../pages/prescriptions/PrescriptionsPage'))
const HealthMetricsPage = lazy(() => import('../pages/health/HealthMetricsPage'))
const PatientFeedbacksPage = lazy(() => import('../pages/feedbacks/PatientFeedbacksPage'))
const AccountsPage = lazy(() => import('../pages/account/AccountsPage'))
const MedicinesPage = lazy(() => import('../pages/medicines/MedicinesPage'))

// Session frontend dùng thống nhất 2 key này.
function clearStoredSession() {
  localStorage.removeItem('doctor_health_token')
  localStorage.removeItem('doctor_health_user')
  clearListCache()
}

// Hàm getStoredUser nạp dữ liệu từ API hoặc nguồn dữ liệu hiện có để cập nhật giao diện.
function getStoredUser() {
  try {
    if (!localStorage.getItem('doctor_health_token')) return null
    const rawUser = localStorage.getItem('doctor_health_user')
    return rawUser ? JSON.parse(rawUser) : null
  } catch {
    return null
  }
}

/**
 * Hiển thị component ProtectedRoute trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.user Giá trị user được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onUserChange Giá trị onUserChange được dùng để render hoặc xử lý tương tác.
 * @param {*} props.authChecking Giá trị authChecking được dùng để render hoặc xử lý tương tác.
 */
function ProtectedRoute({ user, onUserChange, authChecking }) {
  if (authChecking) return <LoadingState label="Đang kiểm tra đăng nhập..." />
  if (!user) return <Navigate to="/login" replace />
  return <AdminLayout user={user} onUserChange={onUserChange} />
}

function lazyRoute(element) {
  return <Suspense fallback={<LoadingState />}>{element}</Suspense>
}

/**
 * Hiển thị component AppRoutes trong giao diện frontend.
 */
export default function AppRoutes() {
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [user, setUser] = useState(() => getStoredUser())
  const [authChecking, setAuthChecking] = useState(
    () => Boolean(localStorage.getItem('doctor_health_token')) && !getStoredUser(),
  )

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    const token = localStorage.getItem('doctor_health_token')
    if (!token) {
      clearStoredSession()
      return
    }

    getMe()
      .then((currentUser) => {
        localStorage.setItem('doctor_health_user', JSON.stringify(currentUser))
        setUser(currentUser)
      })
      .catch(() => {
        clearStoredSession()
        setUser(null)
      })
      .finally(() => setAuthChecking(false))
  }, [])

  // Nạp sẵn các danh sách hay dùng sau đăng nhập để chuyển trang mượt hơn.
  useEffect(() => {
    if (!user || !localStorage.getItem('doctor_health_token')) return undefined

    const warmCache = () => {
      const requests = [
        getDashboard(),
        getList('/patients', { page: 1, per_page: 20 }),
        getList('/patients', { page: 1, per_page: 50, scope: 'all' }),
        getList('/medical-records', { page: 1, per_page: 20 }),
        getList('/prescriptions', { page: 1, per_page: 20 }),
        getList('/medicine-schedules', { page: 1, per_page: 20 }),
        getList('/health-metrics', { page: 1, per_page: 20 }),
        getList('/patient-feedbacks', { page: 1, per_page: 20 }),
      ]

      requests.forEach((request) => request.catch(() => {}))
    }

    const idleId =
      'requestIdleCallback' in window
        ? window.requestIdleCallback(warmCache, { timeout: 1500 })
        : window.setTimeout(warmCache, 500)

    return () => {
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      } else {
        window.clearTimeout(idleId)
      }
    }
  }, [user])

  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={lazyRoute(<LoginPage onLogin={setUser} />)} />

      {/* Protected routes: tất cả trang nghiệp vụ đều đi qua AdminLayout. */}
      <Route element={<ProtectedRoute user={user} onUserChange={setUser} authChecking={authChecking} />}>
        <Route path="/" element={lazyRoute(<DashboardPage />)} />
        <Route path="/patients" element={lazyRoute(<PatientsPage />)} />
        <Route path="/patients/:id" element={lazyRoute(<PatientDetailPage />)} />
        <Route path="/medical-records" element={lazyRoute(<MedicalRecordsPage />)} />
        <Route path="/medical-records/:id" element={lazyRoute(<MedicalRecordDetailPage />)} />
        <Route path="/prescriptions/create" element={lazyRoute(<PrescriptionCreateRoute />)} />
        <Route path="/prescriptions/:id/edit" element={lazyRoute(<PrescriptionEditRoute />)} />
        <Route path="/prescriptions/:id" element={lazyRoute(<PrescriptionsPage />)} />
        <Route path="/prescriptions" element={lazyRoute(<PrescriptionCollectionRoute />)} />
        <Route path="/medicines" element={lazyRoute(<MedicinesPage />)} />
        <Route path="/medication-reminders" element={<Navigate to="/schedules" replace />} />
        <Route path="/schedules/create" element={lazyRoute(<ScheduleCreateRoute />)} />
        <Route path="/schedules/:id/edit" element={lazyRoute(<ScheduleEditRoute />)} />
        <Route path="/schedules" element={lazyRoute(<ScheduleCollectionRoute />)} />
        <Route path="/schedules/:id" element={lazyRoute(<ScheduleMemberRoute />)} />
        <Route path="/health-metrics" element={lazyRoute(<HealthMetricsPage />)} />
        <Route path="/patient-feedbacks" element={lazyRoute(<PatientFeedbacksPage />)} />
        <Route path="/accounts" element={lazyRoute(<AccountsPage />)} />
      </Route>

      {/* Route không tồn tại quay về dashboard. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
