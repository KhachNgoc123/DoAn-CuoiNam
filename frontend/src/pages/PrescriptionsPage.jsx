import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock3,
  Download,
  Pencil,
  Printer,
} from 'lucide-react'
import useResourceList from '../api/useResourceList'
import { getList, getOne } from '../api/resources'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'
import PrescriptionsListView from '../components/prescriptions/PrescriptionsListView'
import { getDoseCount, getDoseTimes, getPrescriptionStartDate } from '../utils/prescriptions'
import { formatDate, formatGender, formatPatientCode, statusAfterEndDate } from '../utils/formatters'
import { downloadStyledExcel } from '../utils/excelExport'

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

function medicineName(detail) {
  return detail.medicine?.medicine_name || detail.medicine_name || detail.name || 'Thuốc điều trị'
}

function doseText(detail) {
  return detail.dosage || detail.dose || detail.dosage_text || '-'
}

function medicineUnit(detail) {
  return detail.unit || detail.medicine?.unit || ''
}

function medicineQuantity(detail) {
  return [detail.quantity, medicineUnit(detail)].filter(Boolean).join(' ') || '-'
}

function treatmentDays(prescription) {
  if (prescription.duration_days) return `${prescription.duration_days} ngày`
  if (!prescription.start_date || !prescription.end_date) return '-'
  const start = new Date(prescription.start_date)
  const end = new Date(prescription.end_date)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-'
  return `${Math.max(1, Math.round((end - start) / 86400000) - 1)} ngày`
}

function usageNote(detail) {
  const mealText = (detail.schedules || [])
    .map((schedule) => schedule.meal_time?.meal_time_name || schedule.meal_time_name)
    .filter(Boolean)
    .join(', ')
  return detail.note || detail.instructions || detail.usage_note || mealText || 'Theo chỉ định'
}

function medicineActiveIngredient(detail) {
  return (
    detail.medicine?.active_ingredient ||
    detail.medicine?.ingredient ||
    detail.medicine?.substance ||
    detail.medicine?.description ||
    ''
  )
}

function medicineCode(detail, index) {
  return (
    detail.medicine?.medicine_code ||
    detail.medicine?.code ||
    detail.medicine?.medicine_id ||
    detail.medicine_id ||
    index + 1
  )
}

function printUsageText(detail) {
  return [
    doseText(detail),
    getDoseCount(detail),
    usageNote(detail),
    getDoseTimes(detail).length ? `Giờ uống: ${getDoseTimes(detail).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('; ')
}

function PrescriptionPrintSheet({ prescription, patient, doctor, medicalRecord, details, prescribedDate }) {
  return (
    <section className="rx-print-only rx-a4-sheet" aria-hidden="true">
      <div className="rx-header">
        <div className="rx-brand">
          <div className="rx-logo">+</div>
          <div>
            <strong>BỆNH VIỆN / PHÒNG KHÁM</strong>
            <span>Đơn thuốc ngoại trú</span>
          </div>
        </div>
        <div className="rx-code-block">
          <span>Mã đơn thuốc</span>
          <strong>{prescriptionCode(prescription)}</strong>
        </div>
      </div>

      <h1>ĐƠN THUỐC NGOẠI TRÚ</h1>

      <section className="rx-section">
        <div className="rx-section-title">
          <span>1</span>
          <h2>Thông tin bệnh nhân</h2>
        </div>
        <div className="rx-patient-info">
          <div>
            <span>Mã bệnh nhân</span>
            <strong>{formatPatientCode(patient)}</strong>
          </div>
          <div>
            <span>Họ và tên</span>
            <strong>{patient.full_name || '-'}</strong>
          </div>
          <div>
            <span>Ngày sinh</span>
            <strong>{formatDate(patient.date_of_birth)}</strong>
          </div>
          <div>
            <span>Giới tính</span>
            <strong>{formatGender(patient.gender)}</strong>
          </div>
          <div>
            <span>Số điện thoại</span>
            <strong>{patient.phone || '-'}</strong>
          </div>
          <div className="wide">
            <span>Địa chỉ</span>
            <strong>{patient.address || '-'}</strong>
          </div>
          <div>
            <span>Ngày kê toa</span>
            <strong>{formatDate(prescribedDate)}</strong>
          </div>
        </div>
      </section>

      <section className="rx-section">
        <div className="rx-section-title">
          <span>2</span>
          <h2>Thông tin khám bệnh</h2>
        </div>
        <div className="rx-patient-info">
          <div className="wide">
            <span>Chẩn đoán</span>
            <strong>{medicalRecord.diagnosis || medicalRecord.diagnosis_text || '-'}</strong>
          </div>
          <div>
            <span>Bác sĩ kê toa</span>
            <strong>{doctorName(doctor)}</strong>
          </div>
          <div>
            <span>Lưu ý</span>
            <strong>{medicalRecord.allergy || patient.allergy || 'Không'}</strong>
          </div>
        </div>
      </section>

      <section className="rx-section rx-table-section">
        <div className="rx-section-title">
          <span>3</span>
          <h2>Danh sách thuốc</h2>
        </div>
        <div className="rx-table-wrap">
          <table className="rx-table rx-prescription-table">
            <thead>
              <tr>
                <th>Mã thuốc</th>
                <th>Hoạt chất</th>
                <th>Tên thuốc</th>
                <th>ĐVT</th>
                <th>SL</th>
                <th>Cách dùng</th>
              </tr>
            </thead>
            <tbody>
              {details.length ? (
                details.map((detail, index) => (
                  <tr key={detail.prescription_detail_id || index}>
                    <td>{medicineCode(detail, index)}</td>
                    <td>{medicineActiveIngredient(detail) || '-'}</td>
                    <td>
                      <strong>{medicineName(detail)}</strong>
                    </td>
                    <td>{medicineUnit(detail) || '-'}</td>
                    <td>{detail.quantity || '-'}</td>
                    <td>{printUsageText(detail)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">Chưa có thuốc trong đơn</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rx-section">
        <div className="rx-advice">
          <span>Hướng dẫn sử dụng</span>
          <strong>
            Uống thuốc đúng giờ theo hướng dẫn. Không tự ý ngừng thuốc. Liên hệ bác sĩ khi có dấu hiệu bất thường.
          </strong>
        </div>
      </section>

      <div className="rx-date">Ngày ...... tháng ...... năm ......</div>
      <div className="rx-signatures">
        <div>
          <strong>Bệnh nhân</strong>
          <span>(Ký và ghi rõ họ tên)</span>
        </div>
        <div>
          <strong>Bác sĩ kê đơn</strong>
          <span>{doctorName(doctor)}</span>
        </div>
      </div>
    </section>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="rx-detail-info-item">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

function PrescriptionDetailView({ prescriptionId, onBack }) {
  const navigate = useNavigate()
  const [prescription, setPrescription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    window.queueMicrotask(() => {
      if (mounted) setLoading(true)
    })
    getOne('/prescriptions', prescriptionId)
      .then((data) => {
        if (mounted) setPrescription(data)
      })
      .catch(() => {
        if (mounted) setPrescription(null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [prescriptionId])

  if (loading) return <LoadingState label="Đang tải chi tiết đơn thuốc..." />
  if (!prescription) return <EmptyState title="Không tìm thấy đơn thuốc" />

  const medicalRecord = prescription.medical_record || {}
  const patient = medicalRecord.patient || {}
  const doctor = medicalRecord.doctor || {}
  const details = prescription.details || []
  const firstSchedule = details.flatMap((detail) => detail.schedules || [])[0] || null
  const patientId = patient.patient_id || medicalRecord.patient_id || ''
  const prescribedDate = getPrescriptionStartDate(prescription) || prescription.created_at
  const status = statusAfterEndDate(prescription)

  function exportDetailExcel() {
    downloadStyledExcel(`${prescriptionCode(prescription)}.xls`, {
      title: `Chi tiết đơn thuốc ${prescriptionCode(prescription)}`,
      rows: [
        [`Chi tiết đơn thuốc ${prescriptionCode(prescription)}`],
        ['Bệnh nhân', patient.full_name || ''],
        ['Ngày kê toa', formatDate(prescribedDate)],
        ['Bác sĩ kê toa', doctorName(doctor)],
        ['Chẩn đoán', medicalRecord.diagnosis || ''],
        [],
        ['STT', 'Tên thuốc', 'Liều dùng', 'Tần suất', 'Số lượng', 'Ghi chú'],
        ...details.map((detail, index) => [
          index + 1,
          medicineName(detail),
          doseText(detail),
          getDoseCount(detail),
          medicineQuantity(detail),
          usageNote(detail),
        ]),
      ],
    })
  }

  function printPrescriptionA4() {
    document.body.classList.add('printing-prescription')
    window.print()
    window.setTimeout(() => {
      document.body.classList.remove('printing-prescription')
    }, 300)
  }

  return (
    <main className="page rx-detail-page">
      <section className="rx-detail-hero">
        <div>
          <h1>Chi tiết đơn thuốc</h1>
          <p>
            {prescriptionCode(prescription)} • <StatusBadge value={status} />
          </p>
        </div>
        <div className="rx-detail-actions">
          <button type="button" className="secondary-button" onClick={onBack}>
            <ArrowLeft size={17} /> Quay lại
          </button>
          <button type="button" className="secondary-button" onClick={exportDetailExcel}>
            <Download size={17} /> Excel
          </button>
          {prescription.can_modify && (
            <button
              type="button"
              className="rx-warning-button"
              onClick={() =>
                navigate('/prescriptions', {
                  state: { mode: 'edit', prescriptionId: prescription.prescription_id },
                })
              }
            >
              <Pencil size={17} /> Sửa toa thuốc
            </button>
          )}
          <button
            type="button"
            className="rx-dark-button"
            onClick={() =>
              firstSchedule
                ? navigate(`/schedules/${firstSchedule.schedule_id || firstSchedule.id}`, {
                    state: { patientId, prescriptionId: prescription.prescription_id },
                  })
                : navigate('/schedules', {
                    state: {
                      mode: 'createFromPrescription',
                      patientId,
                      prescriptionId: prescription.prescription_id,
                    },
                  })
            }
          >
            <Clock3 size={17} /> {firstSchedule ? 'Xem lịch uống' : 'Tạo lịch nhắc'}
          </button>
          <button type="button" className="primary-button" onClick={printPrescriptionA4}>
            <Printer size={17} /> In A4 / PDF
          </button>
        </div>
      </section>

      <section className="rx-detail-grid">
        <article className="rx-detail-card rx-patient-card">
          <h2>Thông tin bệnh nhân</h2>
          <div className="rx-detail-info-grid rx-detail-info-grid-2">
            <InfoItem label="Mã bệnh nhân" value={formatPatientCode(patient)} />
            <InfoItem label="Họ tên" value={patient.full_name} />
            <InfoItem label="Giới tính" value={formatGender(patient.gender)} />
            <InfoItem label="Ngày sinh" value={formatDate(patient.date_of_birth)} />
            <InfoItem label="Điện thoại" value={patient.phone} />
            <InfoItem label="Địa chỉ" value={patient.address} />
          </div>
        </article>

        <article className="rx-detail-card">
          <h2>Thông tin đơn thuốc</h2>
          <div className="rx-detail-info-grid">
            <InfoItem label="Mã đơn thuốc" value={prescriptionCode(prescription)} />
            <InfoItem label="Ngày kê toa" value={formatDate(prescribedDate)} />
            <InfoItem label="Bác sĩ kê toa" value={doctorName(doctor)} />
            <InfoItem label="Chẩn đoán" value={medicalRecord.diagnosis} />
            <InfoItem label="Ghi chú" value={prescription.note || medicalRecord.note} />
          </div>
        </article>
      </section>

      <section className="rx-detail-card rx-medicine-section">
        <h2>Danh sách thuốc</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên thuốc</th>
                <th>Liều dùng</th>
                <th>Tần suất</th>
                <th>Số lượng</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {details.length ? (
                details.map((detail, index) => (
                  <tr key={detail.prescription_detail_id || index}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{medicineName(detail)}</strong>
                    </td>
                    <td>{doseText(detail)}</td>
                    <td>{getDoseCount(detail)}</td>
                    <td>{medicineQuantity(detail)}</td>
                    <td>{usageNote(detail)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">Chưa có thuốc trong đơn</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <PrescriptionPrintSheet
        prescription={prescription}
        patient={patient}
        doctor={doctor}
        medicalRecord={medicalRecord}
        details={details}
        prescribedDate={prescribedDate}
      />
    </main>
  )
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
    return status.includes('dùng') || status.includes('sử')
  }).length
  const completedCount = rows.filter((item) => String(statusAfterEndDate(item)).toLowerCase().includes('hoàn')).length
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
    window.queueMicrotask(() => setViewingId(location.state?.viewPrescriptionId || null))
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
      title: 'Danh sách đơn thuốc',
      rows: [
        ['Danh sách đơn thuốc'],
        ['STT', 'Mã đơn', 'Bệnh nhân', 'Ngày kê toa', 'Bác sĩ phụ trách', 'Chẩn đoán', 'Ngày bắt đầu', 'Ngày kết thúc', 'Số ngày dùng', 'Số lượng thuốc', 'Trạng thái'],
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
    <PrescriptionsListView
      rows={rows}
      params={params}
      loading={loading}
      toast={toast}
      patients={patients}
      patientCount={patientCount}
      activeCount={activeCount}
      completedCount={completedCount}
      prescriptionPatient={prescriptionPatient}
      prescriptionDoctor={prescriptionDoctor}
      prescriptionCode={prescriptionCode}
      doctorName={doctorName}
      treatmentDays={treatmentDays}
      statusAfterEndDate={statusAfterEndDate}
      onExportExcel={exportExcel}
      onCreate={() => navigate('/prescriptions', { state: { mode: 'create' } })}
      onSetParams={setParams}
      onRefetch={refetch}
      onOpenDetail={openDetail}
      onEdit={(prescription) =>
        navigate('/prescriptions', {
          state: { mode: 'edit', prescriptionId: prescription.prescription_id },
        })
      }
      onCloseToast={() => setToast(null)}
    />
  )
}
