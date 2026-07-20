/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import useResourceList from '../api/useResourceList'
import { createOne, getList, updateOne } from '../api/resources'
import { getErrorMessage } from '../api/client'
import MedicalRecordEntryView from '../components/medical-records/MedicalRecordEntryView'
import MedicalRecordFilterBar from '../components/medical-records/MedicalRecordFilterBar'
import MedicalRecordListHeader from '../components/medical-records/MedicalRecordListHeader'
import MedicalRecordTable from '../components/medical-records/MedicalRecordTable'
import PatientMedicalRecordsView from '../components/medical-records/PatientMedicalRecordsView'
import Toast from '../components/ui/Toast'
import { formatDate, isMedicalRecordInTreatmentStatus } from '../utils/formatters'
import { clearActiveVisit, getActiveVisit, setActiveVisit } from '../utils/activeVisit'
import { downloadStyledExcel } from '../utils/excelExport'
import { formatRecordCode } from '../components/medical-records/medicalRecordHelpers'

const ACTIVE_RECORD_MESSAGE =
  'Bệnh nhân đang có một hồ sơ điều trị. Vui lòng hoàn thành điều trị trước khi tạo hồ sơ bệnh án mới.'

const statusFilterOptions = [
  { value: '', label: 'Tất cả' },
  { value: 'in_treatment', label: 'Đang điều trị' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'follow_up', label: 'Theo dõi' },
  { value: 'urgent', label: 'Khẩn cấp' },
]

function sortMedicalRecords(records) {
  return [...records].sort((left, right) => {
    const leftActive = isMedicalRecordInTreatmentStatus(left.status)
    const rightActive = isMedicalRecordInTreatmentStatus(right.status)
    if (leftActive !== rightActive) return leftActive ? -1 : 1

    const leftDate = new Date(left.visit_date || left.created_at || 0).getTime()
    const rightDate = new Date(right.visit_date || right.created_at || 0).getTime()
    return rightDate - leftDate
  })
}

export default function MedicalRecordsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const activeVisit = getActiveVisit()
  const createPatientId = location.state?.createPatientId || ''
  const routedPatientId = location.state?.patientId || ''
  const [workflow, setWorkflow] = useState(location.state?.workflow || '')
  const initialPatientId = searchParams.get('patient_id') || createPatientId || routedPatientId
  const { items, params, setParams, loading, refetch } = useResourceList(
    '/medical-records',
    initialPatientId ? { patient_id: initialPatientId, per_page: 20 } : { per_page: 20 },
  )
  const [patients, setPatients] = useState([])
  const [healthTypes, setHealthTypes] = useState([])
  const [recordSuggestions, setRecordSuggestions] = useState({})
  const [recordFormOptionsRequested, setRecordFormOptionsRequested] = useState(false)
  const [showForm, setShowForm] = useState(Boolean(createPatientId))
  const [editingRecord, setEditingRecord] = useState(
    createPatientId
      ? {
          ...activeVisit?.draft,
          patient_id: createPatientId,
          patient: activeVisit?.patientId
            ? {
                patient_id: activeVisit.patientId,
                full_name: activeVisit.patientName,
                gender: activeVisit.gender,
                date_of_birth: activeVisit.dateOfBirth,
                phone: activeVisit.phone,
                address: activeVisit.address,
              }
            : null,
        }
      : null,
  )
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(() => location.state?.toast || null)

  useEffect(() => {
    const routeToast = location.state?.toast
    if (!routeToast) return
    navigate(location.pathname, {
      replace: true,
      state: { ...location.state, toast: null },
    })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    getList('/patients', { per_page: 50, scope: 'all' })
      .then((result) => setPatients(result.items))
      .catch(() => setPatients([]))
  }, [])

  useEffect(() => {
    if (!showForm || recordFormOptionsRequested) return
    setRecordFormOptionsRequested(true)

    Promise.all([getList('/health-types'), getList('/medical-record-suggestions')])
      .then(([typeResult, suggestionResult]) => {
        setHealthTypes(typeResult.items)
        setRecordSuggestions(suggestionResult.raw || {})
      })
      .catch(() => {
        setHealthTypes([])
        setRecordSuggestions({})
      })
  }, [recordFormOptionsRequested, showForm])

  useEffect(() => {
    if (location.state?.createPatientId) {
      navigate('/medical-records', { replace: true })
    }
  }, [location.state, navigate])

  async function saveRecord(payload) {
    setSaving(true)
    try {
      const basicMetrics = payload._basic_metrics || []
      delete payload._basic_metrics
      const patientId = payload.patient_id || editingRecord?.patient_id
      if (!editingRecord?.id) {
        const activeRecord = items.find(
          (item) =>
            String(item.patient_id || item.patient?.patient_id) === String(patientId) &&
            isMedicalRecordInTreatmentStatus(item.status),
        )
        if (activeRecord) {
          setToast({ type: 'error', message: ACTIVE_RECORD_MESSAGE })
          setSaving(false)
          return
        }
      }
      const measureTime = `${payload.visit_date || new Date().toISOString().slice(0, 10)} ${new Date()
        .toTimeString()
        .slice(0, 8)}`
      if (editingRecord?.id) {
        await updateOne('/medical-records', editingRecord.id, payload)
        await Promise.all(
          basicMetrics.map((metric) =>
            createOne('/health-metrics', {
              patient_id: patientId,
              health_type_id: metric.health_type_id,
              measure_time: measureTime,
              value: metric.value,
              note: metric.note,
            }),
          ),
        )
        setToast({ type: 'success', message: 'Đã cập nhật hồ sơ bệnh án.' })
      } else {
        const savedRecord = await createOne('/medical-records', payload)
        await Promise.all(
          basicMetrics.map((metric) =>
            createOne('/health-metrics', {
              patient_id: patientId,
              health_type_id: metric.health_type_id,
              measure_time: measureTime,
              value: metric.value,
              note: metric.note,
            }),
          ),
        )
        setToast({ type: 'success', message: 'Đã thêm hồ sơ bệnh án.' })
        if (workflow === 'new-patient') {
          setWorkflow('')
          clearActiveVisit()
          navigate('/prescriptions', {
            state: {
              mode: 'create',
              recordId: savedRecord.record_id,
              record: savedRecord,
              workflow: 'new-patient',
              toast: { type: 'success', message: 'Đã thêm hồ sơ bệnh án.' },
            },
          })
          return
        }
      }
      setShowForm(false)
      setEditingRecord(null)
      refetch()
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const selectedPatient = patients.find(
    (patient) => String(patient.patient_id) === String(editingRecord?.patient_id),
  )
  const sortedRecords = useMemo(() => sortMedicalRecords(items), [items])

  function clearFilters() {
    setParams({
      patient_id: '',
      search: '',
      status: '',
      visit_date: '',
      from_date: '',
      to_date: '',
      doctor: '',
      diagnosis: '',
      page: 1,
      per_page: 20,
    })
  }

  function exportExcel() {
    downloadStyledExcel('danh-sach-ho-so-benh-an.xls', {
      title: 'Danh sách hồ sơ bệnh án',
      rows: [
        ['Danh sách hồ sơ bệnh án'],
        ['STT', 'Mã hồ sơ', 'Mã bệnh nhân', 'Bệnh nhân', 'Ngày khám', 'Bác sĩ phụ trách', 'Chẩn đoán', 'Trạng thái'],
        ...sortedRecords.map((record, index) => [
          index + 1,
          formatRecordCode(record),
          record.patient?.patient_id || record.patient_id || '',
          record.patient?.full_name || '',
          formatDate(record.visit_date),
          record.doctor?.full_name || '',
          record.diagnosis || '',
          record.status || '',
        ]),
      ],
    })
  }

  const saveActiveVisitDraft = useCallback(
    (draft) => {
      if (workflow !== 'new-patient' || editingRecord?.id || !draft?.patient_id) return
      const currentVisit = getActiveVisit()
      const patient =
        editingRecord?.patient ||
        patients.find((item) => String(item.patient_id) === String(draft.patient_id)) ||
        currentVisit

      setActiveVisit({
        ...currentVisit,
        patientId: draft.patient_id,
        patientName: patient?.full_name || currentVisit?.patientName,
        gender: patient?.gender || currentVisit?.gender,
        dateOfBirth: patient?.date_of_birth || currentVisit?.dateOfBirth,
        phone: patient?.phone || currentVisit?.phone,
        address: patient?.address || currentVisit?.address,
        workflow: 'new-patient',
        draft,
      })
    },
    [editingRecord, patients, workflow],
  )

  function cancelForm() {
    if (workflow === 'new-patient') {
      clearActiveVisit()
      setWorkflow('')
    }
    setShowForm(false)
    setEditingRecord(null)
  }

  if (showForm) {
    return (
      <MedicalRecordEntryView
        editingRecord={editingRecord}
        formPatient={editingRecord?.patient || selectedPatient}
        patients={patients}
        healthTypes={healthTypes}
        recordSuggestions={recordSuggestions}
        saving={saving}
        toast={toast}
        onSubmit={saveRecord}
        onDraftChange={saveActiveVisitDraft}
        onCancel={cancelForm}
        onCloseToast={() => setToast(null)}
      />
    )
  }

  return (
    <main className="page mc-records-page">
      <MedicalRecordListHeader
        onExport={exportExcel}
        onCreate={() => {
          setEditingRecord(null)
          setShowForm(true)
        }}
      />

      {routedPatientId ? (
        <PatientMedicalRecordsView
          records={sortedRecords}
          loading={loading}
          onView={(record) => navigate(`/medical-records/${record.id || record.record_id}`)}
        />
      ) : (
        <>
          <MedicalRecordFilterBar
            params={params}
            patients={patients}
            statusOptions={statusFilterOptions}
            onParamsChange={setParams}
            onSearch={refetch}
            onClear={clearFilters}
          />
          <MedicalRecordTable
            records={sortedRecords}
            loading={loading}
            onView={(record) => navigate(`/medical-records/${record.id || record.record_id}`)}
            onEdit={(record) => {
              setEditingRecord({ ...record, id: record.id || record.record_id })
              setShowForm(true)
            }}
          />
        </>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
