import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import AdminLayout from '../components/layout/AdminLayout'
import { getMe } from '../api/authApi'
import { clearListCache, getDashboard, getList } from '../api/resources'
import LoadingState from '../components/ui/LoadingState'
import {
  PrescriptionCollectionRoute,
  ScheduleCollectionRoute,
  ScheduleMemberRoute,
} from './ResourceRouteViews'

const LoginPage = lazy(() => import('../pages/LoginPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const PatientsPage = lazy(() => import('../pages/PatientsPage'))
const PatientDetailPage = lazy(() => import('../pages/PatientDetailPage'))
const MedicalRecordsPage = lazy(() => import('../pages/MedicalRecordsPage'))
const MedicalRecordDetailPage = lazy(() => import('../pages/MedicalRecordDetailPage'))
const HealthMetricsPage = lazy(() => import('../pages/HealthMetricsPage'))
const PatientFeedbacksPage = lazy(() => import('../pages/PatientFeedbacksPage'))
const AccountsPage = lazy(() => import('../pages/AccountsPage'))
const MedicinesPage = lazy(() => import('../pages/MedicinesPage'))

function clearStoredSession() {
  localStorage.removeItem('doctor_health_token')
  localStorage.removeItem('doctor_health_user')
  clearListCache()
}

function getStoredUser() {
  try {
    if (!localStorage.getItem('doctor_health_token')) return null
    const rawUser = localStorage.getItem('doctor_health_user')
    return rawUser ? JSON.parse(rawUser) : null
  } catch {
    return null
  }
}

function ProtectedRoute({ user, onUserChange, authChecking }) {
  if (authChecking) return <LoadingState label="?ang ki?m tra ??ng nh?p..." />
  if (!user) return <Navigate to="/login" replace />
  return <AdminLayout user={user} onUserChange={onUserChange} />
}

function lazyRoute(element) {
  return <Suspense fallback={<LoadingState />}>{element}</Suspense>
}

export default function AppRoutes() {
  const [user, setUser] = useState(() => getStoredUser())
  const [authChecking, setAuthChecking] = useState(
    () => Boolean(localStorage.getItem('doctor_health_token')) && !getStoredUser(),
  )

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
      <Route path="/login" element={lazyRoute(<LoginPage onLogin={setUser} />)} />
      <Route element={<ProtectedRoute user={user} onUserChange={setUser} authChecking={authChecking} />}>
        <Route path="/" element={lazyRoute(<DashboardPage />)} />
        <Route path="/patients" element={lazyRoute(<PatientsPage />)} />
        <Route path="/patients/:id" element={lazyRoute(<PatientDetailPage />)} />
        <Route path="/medical-records" element={lazyRoute(<MedicalRecordsPage />)} />
        <Route path="/medical-records/:id" element={lazyRoute(<MedicalRecordDetailPage />)} />
        <Route path="/prescriptions" element={lazyRoute(<PrescriptionCollectionRoute />)} />
        <Route path="/medicines" element={lazyRoute(<MedicinesPage />)} />
        <Route path="/medication-reminders" element={<Navigate to="/schedules" replace />} />
        <Route path="/schedules" element={lazyRoute(<ScheduleCollectionRoute />)} />
        <Route path="/schedules/:id" element={lazyRoute(<ScheduleMemberRoute />)} />
        <Route path="/health-metrics" element={lazyRoute(<HealthMetricsPage />)} />
        <Route path="/patient-feedbacks" element={lazyRoute(<PatientFeedbacksPage />)} />
        <Route path="/accounts" element={lazyRoute(<AccountsPage />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
