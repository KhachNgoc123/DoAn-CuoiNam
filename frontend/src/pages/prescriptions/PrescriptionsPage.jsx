/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Eye,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
} from 'lucide-react'
import useResourceList from '../../hooks/useResourceList'
import { getList } from '../../services/resourceService'
import StatusBadge from '../../components/common/StatusBadge/StatusBadge'
import Toast from '../../components/common/Toast/Toast'
import PatientSearchBox from '../../components/patients/PatientSearchBox'
import PrescriptionDetailView from '../../components/prescriptions/PrescriptionDetailView'
import { getPrescriptionStartDate } from '../../utils/prescriptions'
import { formatDate, statusAfterEndDate } from '../../utils/formatters'
import { downloadStyledExcel } from '../../utils/excelExport'

function prescriptionPatient(prescription) {
  return prescription.medical_record?.patient || {}
}

function prescriptionDoctor(prescription) {
  return prescription.medical_record?.doctor || {}
}

function prescriptionCode(prescription) {
  const rawCode =
    prescription?.prescription_code ||
    prescription?.code ||
    prescription?.prescription_id ||
    prescription?.id

  if (!rawCode) return 'DT0000'
  const text = String(rawCode)
  return text.startsWith('DT') ? text.replace('-', '') : `DT${text.padStart(3, '0')}`
}

function doctorName(doctor) {
  const name = doctor.full_name || doctor.name
  return name ? ` ${name}` : '-'
}

function treatmentDays(prescription) {
  if (prescription.duration_days) return `${prescription.duration_days} ng?y`
  if (!prescription.start_date || !prescription.end_date) return '-'
  const start = new Date(prescription.start_date)
  const end = new Date(prescription.end_date)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-'
  return `${Math.max(1, Math.round((end - start) / 86400000) - 1)} ng?y`
}

export default function PrescriptionsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const patientId = location.state?.patientId || ''
  const { items, params, setParams, loading, refetch } = useResourceList(
    '/prescriptions',
    patientId ? { patient_id: patientId, per_page: 20 } : { per_page: 20 },
  )
  const [viewingId, setViewingId] = useState(location.state?.viewPrescriptionId || null)
  const [toast, setToast] = useState(() => location.state?.toast || null)
  const [patients, setPatients] = useState([])

  const rows = useMemo(() => items || [], [items])
  const activeCount = rows.filter((item) => {
    const status = String(statusAfterEndDate(item)).toLowerCase()
    return status.includes('d?ng') || status.includes('s?')
  }).length
  const completedCount = rows.filter((item) => String(statusAfterEndDate(item)).toLowerCase().includes('ho?n')).length
  const patientCount = new Set(rows.map((item) => prescriptionPatient(item).patient_id).filter(Boolean)).size

  useEffect(() => {
    const routeToast = location.state?.toast
    if (!routeToast) return
    navigate(location.pathname, {
      replace: true,
      state: { ...location.state, toast: null },
    })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    setViewingId(location.state?.viewPrescriptionId || null)
  }, [location.state?.viewPrescriptionId])

  useEffect(() => {
    let active = true
    getList('/patients', { per_page: 50, scope: 'all' })
      .then((result) => {
        if (active) setPatients(result.items || [])
      })
      .catch(() => {
        if (active) setPatients([])
      })

    return () => {
      active = false
    }
  }, [])

  function exportExcel() {
    downloadStyledExcel('danh-sach-don-thuoc.xls', {
      title: 'Danh s?ch ??n thu?c',
      rows: [
        ['Danh s?ch ??n thu?c'],
        ['STT', 'M? ??n', 'B?nh nh?n', 'Ng?y k? toa', 'B?c s? ph? tr?ch', 'Ch?n ?o?n', 'Ng?y b?t ??u', 'Ng?y k?t th?c', 'S? ng?y d?ng', 'S? l??ng thu?c', 'Tr?ng th?i'],
        ...rows.map((item, index) => [
          index + 1,
          prescriptionCode(item),
          prescriptionPatient(item).full_name || '',
          formatDate(getPrescriptionStartDate(item)),
          doctorName(prescriptionDoctor(item)),
          item.medical_record?.diagnosis || '',
          formatDate(item.start_date),
          formatDate(item.end_date),
          treatmentDays(item),
          item.details?.length || 0,
          statusAfterEndDate(item) || '',
        ]),
      ],
    })
  }

  function openDetail(prescription) {
    const id = prescription.prescription_id
    setViewingId(id)
    navigate('/prescriptions', { replace: true, state: { viewPrescriptionId: id } })
  }

  function closeDetail() {
    setViewingId(null)
    navigate('/prescriptions', { replace: true, state: null })
  }

  if (viewingId) return <PrescriptionDetailView prescriptionId={viewingId} onBack={closeDetail} />

  return (
    <main className="page prescriptions-page mc-prescriptions-page">
      <section className="mc-list-hero">
        <div>
          <h1>Qu?n l? toa thu?c</h1>
        </div>
        <div className="rx-list-actions">
          <button type="button" className="secondary-button prescription-export-button" onClick={exportExcel}>
            <FileSpreadsheet size={17} /> Excel
          </button>
          <button
            type="button"
            className="primary-button prescription-create-button"
            onClick={() => navigate('/prescriptions', { state: { mode: 'create' } })}
          >
            <Plus size={18} /> K? toa thu?c
          </button>
        </div>
      </section>

      <section className="rx-filter-card">
        <label>
          <span>T? kh?a</span>
          <div className="mc-filter-input">
            <Search size={17} />
            <PatientSearchBox
              patients={patients}
              value=""
              queryValue={params.search || ''}
              onSelect={(patient) => setParams({ search: patient ? patient.full_name : '', page: 1 })}
              onQueryChange={(search) => setParams({ search, page: 1 })}
              placeholder="M? toa, b?nh nh?n, s? ?i?n tho?i"
            />
          </div>
        </label>
        <label>
          <span>Tr?ng th?i</span>
          <select value={params.status || ''} onChange={(event) => setParams({ status: event.target.value, page: 1 })}>
            <option value="">T?t c?</option>
            <option value="active">Đang dùng</option>
            <option value="completed">Ho?n th?nh</option>
          </select>
        </label>
        <label>
          <span>T? ng?y</span>
          <input type="date" value={params.from_date || ''} onChange={(event) => setParams({ from_date: event.target.value, page: 1 })} />
        </label>
        <label>
          <span>Đến ngày</span>
          <input type="date" value={params.to_date || ''} onChange={(event) => setParams({ to_date: event.target.value, page: 1 })} />
        </label>
        <button type="button" className="mc-search-button" onClick={() => refetch()}>
          <Search size={17} /> T?m ki?m
        </button>
        
      </section>

      <section className="rx-stat-grid">
        <article>
          <span>B?nh nh?n</span>
          <strong>{patientCount}</strong>
        </article>
        <article>
          <span>??n thu?c</span>
          <strong>{rows.length}</strong>
        </article>
        <article>
          <span>Đang dùng</span>
          <strong>{activeCount}</strong>
        </article>
        <article>
          <span>Ho?n th?nh</span>
          <strong>{completedCount}</strong>
        </article>
      </section>

      <section className="mc-table-panel rx-table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>M? toa</th>
                <th>B?nh nh?n</th>
                <th>Ng?y k? toa</th>
                <th>B?c s?</th>
                <th>Ch?n ?o?n</th>
                <th>B?t d?u</th>
                <th>K?t th?c</th>
                <th>S? ng?y</th>
                <th>Tr?ng th?i</th>
                <th>S? thu?c</th>
                <th>Thao t?c</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="12">?ang t?i danh s?ch ??n thu?c...</td>
                </tr>
              ) : rows.length ? (
                rows.map((prescription, index) => {
                  const patient = prescriptionPatient(prescription)
                  const doctor = prescriptionDoctor(prescription)

                  return (
                    <tr key={prescription.prescription_id}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{prescriptionCode(prescription)}</strong>
                      </td>
                      <td>
                        <strong>{patient.full_name || '-'}</strong>
                        <small>{patient.phone || ''}</small>
                      </td>
                      <td>{formatDate(getPrescriptionStartDate(prescription)) || '-'}</td>
                      <td>{doctorName(doctor)}</td>
                      <td>{prescription.medical_record?.diagnosis || '-'}</td>
                      <td>{formatDate(prescription.start_date) || '-'}</td>
                      <td>{formatDate(prescription.end_date) || '-'}</td>
                      <td>{treatmentDays(prescription)}</td>
                      <td>
                        <StatusBadge value={statusAfterEndDate(prescription)} />
                      </td>
                      <td>{prescription.details?.length || 0}</td>
                      <td>
                        <div className="mc-row-actions">
                          <button
                            type="button"
                            className="icon-button small"
                            title="Xem chi ti?t"
                            onClick={() => openDetail(prescription)}
                          >
                            <Eye size={16} />
                          </button>
                          {prescription.can_modify && (
                            <button
                              type="button"
                              className="icon-button small"
                              title="S?a toa thu?c"
                              onClick={() =>
                                navigate('/prescriptions', {
                                  state: { mode: 'edit', prescriptionId: prescription.prescription_id },
                                })
                              }
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="12">Ch?a c? ??n thu?c</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
