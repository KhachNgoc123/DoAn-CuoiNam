/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, FileSpreadsheet, Pencil, Plus, RotateCcw, Search } from 'lucide-react'
import useResourceList from '../../hooks/useResourceList'
import { createOne, getList, updateOne } from '../../services/resourceService'
import { getErrorMessage } from '../../services/api'
import StatusBadge from '../../components/common/StatusBadge/StatusBadge'
import Toast from '../../components/common/Toast/Toast'
import MedicalRecordForm from '../../components/medical-records/MedicalRecordForm'
import PatientMedicalRecordsView from '../../components/medical-records/PatientMedicalRecordsView'
import PatientSearchBox from '../../components/patients/PatientSearchBox'
import { formatDate, isMedicalRecordInTreatmentStatus } from '../../utils/formatters'
import { clearActiveVisit, getActiveVisit, setActiveVisit } from '../../utils/activeVisit'
import { downloadStyledExcel } from '../../utils/excelExport'

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

function formatRecordCode(record) {
  return record?.record_code || `HS-${String(record?.record_id || record?.id || '').padStart(3, '0')}`
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
    setParams({ patient_id: '', search: '', status: '', visit_date: '', from_date: '', to_date: '', doctor: '', diagnosis: '', page: 1, per_page: 20 })
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

  if (showForm) {
    const formPatient = editingRecord?.patient || selectedPatient
    return (
      <main className="page medical-record-entry-page">
        <section className="mc-list-hero">
          <div>
            <h1>{editingRecord?.id ? 'Chỉnh sửa hồ sơ bệnh án' : 'Thêm hồ sơ bệnh án'}</h1>
            <p>Nhập triệu chứng, chẩn đoán, ghi chú và các chỉ số cơ bản của lần khám.</p>
          </div>
        </section>
        <section className="medical-record-entry-surface">
          <MedicalRecordForm
            initialValue={{ ...editingRecord, patient: formPatient }}
            patients={patients}
            healthTypes={healthTypes}
            recordSuggestions={recordSuggestions}
            loading={saving}
            onSubmit={saveRecord}
            onDraftChange={saveActiveVisitDraft}
            onCancel={() => {
              if (workflow === 'new-patient') {
                clearActiveVisit()
                setWorkflow('')
              }
              setShowForm(false)
              setEditingRecord(null)
            }}
          />
        </section>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </main>
    )
  }

  return (
    <main className="page mc-records-page">
      <section className="mc-list-hero">
        <div>
          <h1>Quản lý hồ sơ bệnh án</h1>
        </div>
        <button type="button" className="secondary-button prescription-export-button" onClick={exportExcel}>
          <FileSpreadsheet size={17} /> Excel
        </button>
        <button
          className="primary-button mc-add-button"
          onClick={() => {
            setEditingRecord(null)
            setShowForm(true)
          }}
        >
          <Plus size={18} /> Thêm hồ sơ bệnh án
        </button>
      </section>

      {routedPatientId ? (
        <PatientMedicalRecordsView
          records={sortedRecords}
          loading={loading}
          onView={(record) => navigate(`/medical-records/${record.id || record.record_id}`)}
        />
      ) : (
        <>
          <section className="mc-record-filter-card">
            <label>
              <span>Từ khóa</span>
              <div className="mc-filter-input">
                <Search size={17} />
                <PatientSearchBox
                  patients={patients}
                  value={params.patient_id || ''}
                  queryValue={params.search || ''}
                  onSelect={(patient) =>
                    setParams({ patient_id: patient?.patient_id || '', search: '', page: 1, per_page: 20 })
                  }
                  onQueryChange={(search) => setParams({ search, patient_id: '', page: 1, per_page: 20 })}
                  placeholder="Mã hồ sơ, bệnh nhân, SĐT"
                />
              </div>
            </label>
            <label>
              <span>Trạng thái</span>
              <select
                value={params.status || ''}
                onChange={(event) => setParams({ status: event.target.value, page: 1, per_page: 20 })}
              >
                {statusFilterOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Ngày lập hồ sơ</span>
              <input
                type="date"
                value={params.visit_date || ''}
                onChange={(event) => setParams({ visit_date: event.target.value, page: 1, per_page: 20 })}
              />
            </label>
            <label>
              <span>Bác sĩ</span>
              <input
                value={params.doctor || ''}
                onChange={(event) => setParams({ doctor: event.target.value, page: 1, per_page: 20 })}
                placeholder="Tên bác sĩ"
              />
            </label>
            <label>
              <span>Chẩn đoán</span>
              <input
                value={params.diagnosis || ''}
                onChange={(event) => setParams({ diagnosis: event.target.value, page: 1, per_page: 20 })}
                placeholder="Tên chẩn đoán"
              />
            </label>
            <label>
              <span>Từ ngày</span>
              <input
                type="date"
                value={params.from_date || ''}
                onChange={(event) => setParams({ from_date: event.target.value, visit_date: '', page: 1, per_page: 20 })}
              />
            </label>
            <label>
              <span>Đến ngày</span>
              <input
                type="date"
                value={params.to_date || ''}
                onChange={(event) => setParams({ to_date: event.target.value, visit_date: '', page: 1, per_page: 20 })}
              />
            </label>
            <button type="button" className="mc-search-button" onClick={() => refetch()}>
              <Search size={17} /> Tìm kiếm
            </button>
            <button type="button" className="secondary-button" onClick={clearFilters}>
              <RotateCcw size={17} /> Làm mới
            </button>
          </section>

          <section className="mc-table-panel medical-record-list-panel">
            <div className="table-wrap medical-record-list-table-wrap">
              <table className="medical-record-list-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã hồ sơ</th>
                    <th>Bệnh nhân</th>
                    <th>Ngày lập</th>
                    <th>Bác sĩ</th>
                    <th>Chẩn đoán</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8">Đang tải dữ liệu...</td></tr>
                  ) : sortedRecords.length ? (
                    sortedRecords.map((record, index) => (
                      <tr key={record.record_id || record.id}>
                        <td>{index + 1}</td>
                        <td><strong>{formatRecordCode(record)}</strong></td>
                        <td>
                          <div className="cell-stack">
                            <span>{record.patient?.full_name || '-'}</span>
                            <small>{record.patient?.phone || ''}</small>
                          </div>
                        </td>
                        <td>{formatDate(record.visit_date)}</td>
                        <td>{record.doctor?.full_name || '-'}</td>
                        <td>{record.diagnosis || 'Chưa chẩn đoán'}</td>
                        <td><StatusBadge value={record.status} /></td>
                        <td>
                          <div className="mc-row-actions">
                            <button
                              type="button"
                              className="icon-button small"
                              title="Xem chi tiết"
                              onClick={() => navigate(`/medical-records/${record.id || record.record_id}`)}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-button small"
                              title="Cập nhật hồ sơ"
                              onClick={() => {
                                setEditingRecord({ ...record, id: record.id || record.record_id })
                                setShowForm(true)
                              }}
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="8">Chưa có hồ sơ bệnh án</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
