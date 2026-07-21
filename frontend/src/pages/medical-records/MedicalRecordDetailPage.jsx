/**
 * File thuộc nhóm pages, điều phối dữ liệu của từng màn hình trước khi truyền xuống component hiển thị.
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getList, getOne, updateOne } from '../../api/resources'
import { getErrorMessage } from '../../api/client'
import LoadingState from '../../components/ui/LoadingState'
import EmptyState from '../../components/ui/EmptyState'
import Toast from '../../components/ui/Toast'
import MedicalRecordAllergyCard from '../../components/medical-records/MedicalRecordAllergyCard'
import MedicalRecordConditionCard from '../../components/medical-records/MedicalRecordConditionCard'
import MedicalRecordDetailHeader from '../../components/medical-records/MedicalRecordDetailHeader'
import MedicalRecordEditView from '../../components/medical-records/MedicalRecordEditView'
import MedicalRecordHealthCard from '../../components/medical-records/MedicalRecordHealthCard'
import MedicalRecordPatientCard from '../../components/medical-records/MedicalRecordPatientCard'
import MedicalRecordPrescriptionHistory from '../../components/medical-records/MedicalRecordPrescriptionHistory'
import MedicalRecordSummaryCard from '../../components/medical-records/MedicalRecordSummaryCard'
import MedicalRecordVisitHistory from '../../components/medical-records/MedicalRecordVisitHistory'
import { formatDate, statusAfterEndDate } from '../../utils/formatters'
import { downloadStyledExcel } from '../../utils/excelExport'
import {
  allergyRows,
  chronicDiseaseRows,
  collectSchedules,
  findMetric,
  formatPrescriptionCode,
  formatRecordCode,
  latestMetricMap,
  latestPrescriptionRows,
  prescriptionMedicineText,
} from '../../components/medical-records/medicalRecordHelpers'

/**
 * ?i?u ph?i d? li?u v? hi?n th? m?n h?nh MedicalRecordDetail.
 */
export default function MedicalRecordDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [visitHistory, setVisitHistory] = useState([])

  function load() {
    setLoading(true)
    getOne('/medical-records', id)
      .then(setRecord)
      .catch(() => setRecord(null))
      .finally(() => setLoading(false))
  }

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(load, [id])

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    const patientId = record?.patient_id || record?.patient?.patient_id
    if (!patientId) {
      setVisitHistory([])
      return undefined
    }

    let active = true
    getList('/medical-records', { patient_id: patientId, per_page: 20 })
      .then((result) => {
        if (!active) return
        const currentRecordId = String(record.record_id || record.id || id)
        const historyRows = (result.items || [])
          .filter((item) => String(item.record_id || item.id) !== currentRecordId)
          .sort((left, right) => {
            const leftDate = new Date(left.visit_date || left.created_at || 0).getTime()
            const rightDate = new Date(right.visit_date || right.created_at || 0).getTime()
            return rightDate - leftDate
          })
        setVisitHistory(historyRows)
      })
      .catch(() => {
        if (active) setVisitHistory([])
      })

    return () => {
      active = false
    }
  }, [id, record])

  async function save(payload) {
    setSaving(true)
    try {
      setRecord(await updateOne('/medical-records', id, payload))
      setEditing(false)
      setToast({ type: 'success', message: 'Đã cập nhật hồ sơ bệnh án.' })
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const patient = useMemo(() => record?.patient || {}, [record])
  const chronicRows = useMemo(() => chronicDiseaseRows(patient), [patient])
  const allergyHistoryRows = useMemo(() => allergyRows(patient, record || {}), [patient, record])
  const prescriptions = latestPrescriptionRows(record?.prescriptions || [])
  const schedules = collectSchedules(record?.prescriptions || [])
  const metricMap = record ? latestMetricMap(record) : new Map()
  const bloodPressure = findMetric(metricMap, ['huyết áp', 'huyet ap', 'blood pressure'])
  const weight = findMetric(metricMap, ['cân nặng', 'can nang', 'weight'])
  const spo2 = findMetric(metricMap, ['spo2', 'sp o2', 'oxy'])

  function exportRecordExcel() {
    downloadStyledExcel(`${formatRecordCode(record)}.xls`, {
      title: 'Chi tiết hồ sơ bệnh án',
      rows: [
        ['Chi tiết hồ sơ bệnh án'],
        ['Mã hồ sơ', formatRecordCode(record)],
        ['Ngày khám', formatDate(record.visit_date)],
        ['Bệnh nhân', patient.full_name || ''],
        ['Bác sĩ phụ trách', record.doctor?.full_name || ''],
        ['Triệu chứng', record.symptoms || record.chief_complaint || ''],
        ['Chẩn đoán', record.diagnosis || ''],
        ['Ghi chú bác sĩ', record.doctor_note || ''],
        ['Trạng thái', record.status || ''],
        [],
        ['Đơn thuốc liên quan'],
        ['Mã toa', 'Ngày bắt đầu', 'Ngày kết thúc', 'Trạng thái', 'Thuốc'],
        ...(record.prescriptions || []).map((prescription) => [
          formatPrescriptionCode(prescription),
          formatDate(prescription.start_date),
          formatDate(prescription.end_date),
          statusAfterEndDate(prescription),
          prescriptionMedicineText(prescription),
        ]),
      ],
    })
  }

  if (loading) {
    return (
      <main className="page">
        <LoadingState />
      </main>
    )
  }

  if (!record) {
    return (
      <main className="page">
        <EmptyState title="Không tìm thấy hồ sơ hoặc bạn không có quyền xem" />
      </main>
    )
  }

  if (editing) {
    return (
      <MedicalRecordEditView
        record={record}
        patient={patient}
        saving={saving}
        toast={toast}
        onSubmit={save}
        onCancel={() => setEditing(false)}
        onCloseToast={() => setToast(null)}
      />
    )
  }

  return (
    <main className="page mc-record-detail-page">
      <MedicalRecordDetailHeader
        record={record}
        patient={patient}
        onBack={() => navigate('/medical-records')}
        onEdit={() => setEditing(true)}
        onPrescribe={() => navigate('/prescriptions/create', { state: { mode: 'create', recordId: record.record_id } })}
        onExport={exportRecordExcel}
        onPrint={() => window.print()}
        onCreateSchedule={(patientId) =>
          navigate(`/schedules${patientId ? `?patient_id=${patientId}` : ''}`, {
            state: { patientId },
          })
        }
      />

      <section className="mc-record-detail-grid">
        <MedicalRecordPatientCard patient={patient} record={record} />
        <MedicalRecordSummaryCard record={record} />
        <MedicalRecordConditionCard chronicRows={chronicRows} />
        <MedicalRecordAllergyCard allergyRows={allergyHistoryRows} />
        <MedicalRecordHealthCard bloodPressure={bloodPressure} weight={weight} spo2={spo2} />
        <MedicalRecordPrescriptionHistory prescriptions={prescriptions} schedules={schedules} />
        <MedicalRecordVisitHistory
          visitHistory={visitHistory}
          onView={(item) => navigate(`/medical-records/${item.id || item.record_id}`)}
        />
      </section>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
