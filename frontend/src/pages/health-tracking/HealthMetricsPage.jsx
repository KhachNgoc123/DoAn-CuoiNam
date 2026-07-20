/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import useResourceList from '../../hooks/useResourceList'
import { createOne, getList } from '../../services/resourceService'
import { getErrorMessage } from '../../services/api'
import HealthMetricsView from '../../components/health-tracking/HealthMetricsView'
import { EMPTY_TEXT, formatDate, formatDateTime, formatGender } from '../../utils/formatters'

import {
  bloodPressureText,
  bmiText,
  currentMetricText,
  dateHistoryRow,
  findHealthType,
  firstMetricDate,
  groupMetricsByDate,
  groupWarningText,
  groupWarnings,
  metricDefinitions,
  metricFormDefaults,
  metricTypeName,
  patientCode,
  patientGroupsFromData,
  patientLabel,
  patientStatus,
  todayValue,
} from '../../utils/healthMetrics'

export default function HealthMetricsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useOutletContext()
  const { items, loading, error, refetch } = useResourceList('/health-metrics', {
    per_page: 50,
  })
  const [patients, setPatients] = useState([])
  const [healthTypes, setHealthTypes] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [recordingOpen, setRecordingOpen] = useState(false)
  const [recordingPatientId, setRecordingPatientId] = useState('')
  const [filters, setFilters] = useState({
    search: '',
    date: todayValue(),
    status: '',
  })
  const [form, setForm] = useState(metricFormDefaults)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [activePrescriptions, setActivePrescriptions] = useState([])
  const [activePrescriptionLoading, setActivePrescriptionLoading] = useState(false)
  const [activePrescriptionError, setActivePrescriptionError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      getList('/patients', { per_page: 100, scope: 'all' }),
      getList('/health-types', { per_page: 100 }),
    ])
      .then(([patientResult, typeResult]) => {
        if (!active) return
        setPatients(patientResult.items)
        setHealthTypes(typeResult.items)
      })
      .catch(() => {
        if (!active) return
        setPatients([])
        setHealthTypes([])
      })

    return () => {
      active = false
    }
  }, [])

  const groups = useMemo(
    () => patientGroupsFromData(patients, items, filters),
    [filters, items, patients],
  )
  const routePatientId = String(location.state?.patientId || '')
  const selectedGroup = groups.find((group) => group.id === (routePatientId || selectedGroupId)) || null
  const recordingGroup =
    groups.find((group) => group.id === recordingPatientId) ||
    groups.find((group) => group.id === String(form.patient_id)) ||
    null
  const alertGroups = selectedGroup ? [selectedGroup].filter((group) => group.hasAlert) : groups.filter((group) => group.hasAlert)
  const abnormalCount = groups.filter((group) => group.hasAlert).length
  const treatmentCount = groups.filter((group) => patientStatus(group.patient)).length
  const currentDoctorName = user?.full_name ? ` ${user.full_name}` : 'Bác sĩ'

  useEffect(() => {
    const patientId = selectedGroup?.patientId
    if (!patientId) {
      setActivePrescriptions([])
      setActivePrescriptionError('')
      return undefined
    }

    let active = true
    setActivePrescriptionLoading(true)
    setActivePrescriptionError('')
    getList(`/health-metrics/patients/${patientId}/active-prescriptions`, { per_page: 20 })
      .then((result) => {
        if (active) setActivePrescriptions(result.items || [])
      })
      .catch((requestError) => {
        if (!active) return
        setActivePrescriptions([])
        setActivePrescriptionError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setActivePrescriptionLoading(false)
      })

    return () => {
      active = false
    }
  }, [selectedGroup?.patientId])

  function openDetail(group) {
    setSelectedGroupId(group.id)
    navigate('/health-metrics', {
      replace: true,
      state: {
        ...(location.state || {}),
        healthView: 'detail',
        patientId: group.id,
      },
    })
  }

  function openAlerts(group = selectedGroup) {
    navigate('/health-metrics', { replace: true, state: { healthView: 'alerts', patientId: group?.id || '' } })
  }

  function backToList() {
    setSelectedGroupId('')
    navigate('/health-metrics', { replace: true, state: null })
  }

  function backToScheduleDetail() {
    if (location.state?.returnTo) {
      navigate(location.state.returnTo, {
        state: {
          patientId: selectedGroup?.patientId,
          prescriptionId: location.state?.prescriptionId,
        },
      })
      return
    }

    const patientId = selectedGroup?.patientId || location.state?.patientId
    navigate(`/schedules${patientId ? `?patient_id=${patientId}` : ''}`, {
      state: {
        patientId,
        prescriptionId: location.state?.prescriptionId,
      },
    })
  }

  function viewPrescription(prescription) {
    navigate('/prescriptions', {
      state: {
        viewPrescriptionId: prescription.prescription_id,
        patientId: selectedGroup?.patientId,
        returnTo: location.pathname,
      },
    })
  }

  function openRecordForm(group = selectedGroup) {
    const patientId = group?.patientId || ''
    setRecordingOpen(true)
    setRecordingPatientId(patientId)
    setForm({ ...metricFormDefaults, patient_id: patientId, measure_date: todayValue() })
  }

  function closeRecordForm() {
    setRecordingOpen(false)
    setRecordingPatientId('')
    setForm(metricFormDefaults)
  }

  async function submitMetrics(event) {
    event.preventDefault()
    const patientId = form.patient_id || recordingGroup?.patientId
    if (!patientId) {
      setToast({ type: 'error', message: 'Vui lòng chọn bệnh nhân cần ghi nhận chỉ số.' })
      return
    }

    const entries = metricDefinitions
      .map((definition) => ({
        definition,
        value: String(form[definition.key] || '').trim(),
        type: findHealthType(healthTypes, definition.terms),
      }))
      .filter((entry) => entry.value)

    if (!entries.length) {
      setToast({ type: 'error', message: 'Vui lòng nhập ít nhất một chỉ số sức khỏe.' })
      return
    }

    const missingType = entries.find((entry) => !entry.type)
    if (missingType) {
      setToast({
        type: 'error',
        message: `Database chưa có loại chỉ số "${missingType.definition.label}". Vui lòng thêm trong bảng health_types trước.`,
      })
      return
    }

    setSaving(true)
    try {
      const measureTime = `${form.measure_date || todayValue()} ${new Date().toTimeString().slice(0, 8)}`
      await Promise.all(
        entries.map((entry) =>
          createOne('/health-metrics', {
            patient_id: patientId,
            health_type_id: entry.type.health_type_id,
            measure_time: measureTime,
            value: entry.value,
            note: form.note || null,
          }),
        ),
      )
      setToast({ type: 'success', message: 'Đã ghi nhận chỉ số sức khỏe.' })
      closeRecordForm()
      setSelectedGroupId(String(patientId))
      refetch()
    } catch (requestError) {
      setToast({ type: 'error', message: getErrorMessage(requestError) })
    } finally {
      setSaving(false)
    }
  }


  return (
    <HealthMetricsView
      recordingOpen={recordingOpen}
      recordingGroup={recordingGroup}
      patients={patients}
      form={form}
      setForm={setForm}
      submitMetrics={submitMetrics}
      closeRecordForm={closeRecordForm}
      saving={saving}
      toast={toast}
      setToast={setToast}
      location={location}
      selectedGroup={selectedGroup}
      alertGroups={alertGroups}
      openDetail={openDetail}
      backToList={backToList}
      groupWarnings={groupWarnings}
      metricTypeName={metricTypeName}
      patientLabel={patientLabel}
      patientCode={patientCode}
      EMPTY_TEXT={EMPTY_TEXT}
      activePrescriptions={activePrescriptions}
      activePrescriptionLoading={activePrescriptionLoading}
      activePrescriptionError={activePrescriptionError}
      viewPrescription={viewPrescription}
      currentDoctorName={currentDoctorName}
      formatDate={formatDate}
      formatDateTime={formatDateTime}
      formatGender={formatGender}
      backToScheduleDetail={backToScheduleDetail}
      openAlerts={openAlerts}
      openRecordForm={openRecordForm}
      bloodPressureText={bloodPressureText}
      currentMetricText={currentMetricText}
      bmiText={bmiText}
      dateHistoryRow={dateHistoryRow}
      groupMetricsByDate={groupMetricsByDate}
      filters={filters}
      setFilters={setFilters}
      groups={groups}
      loading={loading}
      error={error}
      abnormalCount={abnormalCount}
      treatmentCount={treatmentCount}
      firstMetricDate={firstMetricDate}
      groupWarningText={groupWarningText}
      todayValue={todayValue}
    />
  )
}
