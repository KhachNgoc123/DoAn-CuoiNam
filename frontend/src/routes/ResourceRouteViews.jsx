import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import LoadingState from '../components/common/Loading/Loading'

const PrescriptionsPage = lazy(() => import('../pages/prescriptions/PrescriptionsPage'))
const PrescriptionFormPage = lazy(() => import('../pages/prescriptions/PrescriptionFormPage'))
const MedicationSchedulesPage = lazy(() => import('../pages/schedules/MedicationSchedulesPage'))
const MedicationScheduleFormPage = lazy(() => import('../pages/schedules/MedicationScheduleFormPage'))
const MedicationScheduleDetailPage = lazy(() => import('../pages/schedules/MedicationScheduleDetailPage'))

function lazyRoute(element) {
  return <Suspense fallback={<LoadingState />}>{element}</Suspense>
}

export function PrescriptionCollectionRoute() {
  const location = useLocation()
  if (location.state?.mode === 'create') {
    return lazyRoute(
      <PrescriptionFormPage
        mode="create"
        recordId={location.state.recordId}
        record={location.state.record}
        workflow={location.state.workflow}
      />,
    )
  }
  if (location.state?.mode === 'edit') {
    return lazyRoute(
      <PrescriptionFormPage
        mode="edit"
        prescriptionId={location.state.prescriptionId}
        workflow={location.state.workflow}
      />,
    )
  }
  return lazyRoute(<PrescriptionsPage />)
}

export function ScheduleCollectionRoute() {
  const location = useLocation()
  if (location.state?.mode === 'createFromPrescription') {
    return lazyRoute(
      <MedicationScheduleFormPage
        mode="create"
        prescriptionId={location.state.prescriptionId}
        prescriptionDetailId={location.state.prescriptionDetailId}
        workflow={location.state.workflow}
      />,
    )
  }
  return lazyRoute(<MedicationSchedulesPage />)
}

export function ScheduleMemberRoute() {
  return lazyRoute(<MedicationScheduleDetailPage />)
}
