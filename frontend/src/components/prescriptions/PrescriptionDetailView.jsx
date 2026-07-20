/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock3, Download, Pencil, Printer } from 'lucide-react'
import { getOne } from '../../services/resourceService'
import StatusBadge from '../common/StatusBadge/StatusBadge'
import EmptyState from '../common/EmptyState/EmptyState'
import LoadingState from '../common/Loading/Loading'
import { getDoseCount, getDoseTimes, getPrescriptionStartDate } from '../../utils/prescriptions'
import { formatDate, formatGender, formatPatientCode, statusAfterEndDate } from '../../utils/formatters'
import { downloadStyledExcel } from '../../utils/excelExport'

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
  return detail.medicine?.medicine_name || detail.medicine_name || detail.name || 'Thu?c ?i?u tr?'
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

function usageNote(detail) {
  const mealText = (detail.schedules || [])
    .map((schedule) => schedule.meal_time?.meal_time_name || schedule.meal_time_name)
    .filter(Boolean)
    .join(', ')
  return detail.note || detail.instructions || detail.usage_note || mealText || 'Theo ch? ??nh'
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
    getDoseTimes(detail).length ? `Gi? u?ng: ${getDoseTimes(detail).join(', ')}` : '',
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
            <strong>B?NH VI?N / PH?NG KH?M</strong>
            <span>??n thu?c ngo?i tr?</span>
          </div>
        </div>
        <div className="rx-code-block">
          <span>M? ??n thu?c</span>
          <strong>{prescriptionCode(prescription)}</strong>
        </div>
      </div>

      <h1>??N THU?C NGO?I TR?</h1>

      <section className="rx-section">
        <div className="rx-section-title">
          <span>1</span>
          <h2>Th?ng tin b?nh nh?n</h2>
        </div>
        <div className="rx-patient-info">
          <div>
            <span>M? b?nh nh?n</span>
            <strong>{formatPatientCode(patient)}</strong>
          </div>
          <div>
            <span>H? v? t?n</span>
            <strong>{patient.full_name || '-'}</strong>
          </div>
          <div>
            <span>Ngày sinh</span>
            <strong>{formatDate(patient.date_of_birth)}</strong>
          </div>
          <div>
            <span>Gi?i t?nh</span>
            <strong>{formatGender(patient.gender)}</strong>
          </div>
          <div>
            <span>S? di?n tho?i</span>
            <strong>{patient.phone || '-'}</strong>
          </div>
          <div className="wide">
            <span>??a ch?</span>
            <strong>{patient.address || '-'}</strong>
          </div>
          <div>
            <span>Ng?y k? toa</span>
            <strong>{formatDate(prescribedDate)}</strong>
          </div>
        </div>
      </section>

      <section className="rx-section">
        <div className="rx-section-title">
          <span>2</span>
          <h2>Th?ng tin kh?m b?nh</h2>
        </div>
        <div className="rx-patient-info">
          <div className="wide">
            <span>Ch?n ?o?n</span>
            <strong>{medicalRecord.diagnosis || medicalRecord.diagnosis_text || '-'}</strong>
          </div>
          <div>
            <span>B?c s? k? toa</span>
            <strong>{doctorName(doctor)}</strong>
          </div>
          <div>
            <span>L?u ?</span>
            <strong>{medicalRecord.allergy || patient.allergy || 'Kh?ng'}</strong>
          </div>
        </div>
      </section>

      <section className="rx-section rx-table-section">
        <div className="rx-section-title">
          <span>3</span>
          <h2>Danh s?ch thu?c</h2>
        </div>
        <div className="rx-table-wrap">
          <table className="rx-table rx-prescription-table">
            <thead>
              <tr>
                <th>M? thu?c</th>
                <th>Ho?t ch?t</th>
                <th>T?n thu?c</th>
                <th>?VT</th>
                <th>SL</th>
                <th>C?ch d?ng</th>
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
                  <td colSpan="6">Ch?a c? thu?c trong ??n</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rx-section">
        <div className="rx-advice">
          <span>Hu?ng d?n s? d?ng</span>
          <strong>
            Uống thuốc đúng giờ theo hướng dẫn. Không tự ý ngừng thuốc. Liên hệ bác sĩ khi có dấu hiệu bất thường.
          </strong>
        </div>
      </section>

      <div className="rx-date">Ng?y ...... th?ng ...... n?m ......</div>
      <div className="rx-signatures">
        <div>
          <strong>B?nh nh?n</strong>
          <span>(K? v? ghi r? h? t?n)</span>
        </div>
        <div>
          <strong>B?c s? k? ??n</strong>
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

export default function PrescriptionDetailView({ prescriptionId, onBack }) {
  const navigate = useNavigate()
  const [prescription, setPrescription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
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

  if (loading) return <LoadingState label="?ang t?i chi ti?t ??n thu?c..." />
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
      title: `Chi ti?t ??n thu?c ${prescriptionCode(prescription)}`,
      rows: [
        [`Chi ti?t ??n thu?c ${prescriptionCode(prescription)}`],
        ['B?nh nh?n', patient.full_name || ''],
        ['Ng?y k? toa', formatDate(prescribedDate)],
        ['B?c s? k? toa', doctorName(doctor)],
        ['Ch?n ?o?n', medicalRecord.diagnosis || ''],
        [],
        ['STT', 'T?n thu?c', 'Li?u d?ng', 'T?n su?t', 'S? l??ng', 'Ghi ch?'],
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
          <h1>Chi ti?t ??n thu?c</h1>
          <p>
            {prescriptionCode(prescription)} - <StatusBadge value={status} />
          </p>
        </div>
        <div className="rx-detail-actions">
          <button type="button" className="secondary-button" onClick={onBack}>
            <ArrowLeft size={17} /> Quay l?i
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
              <Pencil size={17} /> S?a toa thu?c
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
            <Clock3 size={17} /> {firstSchedule ? 'Xem l?ch u?ng' : 'T?o l?ch nh?c'}
          </button>
          <button type="button" className="primary-button" onClick={printPrescriptionA4}>
            <Printer size={17} /> In A4 / PDF
          </button>
        </div>
      </section>

      <section className="rx-detail-grid">
        <article className="rx-detail-card rx-patient-card">
          <h2>Th?ng tin b?nh nh?n</h2>
          <div className="rx-detail-info-grid rx-detail-info-grid-2">
            <InfoItem label="M? b?nh nh?n" value={formatPatientCode(patient)} />
            <InfoItem label="H? t?n" value={patient.full_name} />
            <InfoItem label="Gi?i t?nh" value={formatGender(patient.gender)} />
            <InfoItem label="Ngày sinh" value={formatDate(patient.date_of_birth)} />
            <InfoItem label="?i?n tho?i" value={patient.phone} />
            <InfoItem label="??a ch?" value={patient.address} />
          </div>
        </article>

        <article className="rx-detail-card">
          <h2>Th?ng tin ??n thu?c</h2>
          <div className="rx-detail-info-grid">
            <InfoItem label="M? ??n thu?c" value={prescriptionCode(prescription)} />
            <InfoItem label="Ng?y k? toa" value={formatDate(prescribedDate)} />
            <InfoItem label="B?c s? k? toa" value={doctorName(doctor)} />
            <InfoItem label="Ch?n ?o?n" value={medicalRecord.diagnosis} />
            <InfoItem label="Ghi ch?" value={prescription.note || medicalRecord.note} />
          </div>
        </article>
      </section>

      <section className="rx-detail-card rx-medicine-section">
        <h2>Danh s?ch thu?c</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>T?n thu?c</th>
                <th>Li?u d?ng</th>
                <th>T?n su?t</th>
                <th>S? l??ng</th>
                <th>Ghi ch?</th>
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
                  <td colSpan="6">Ch?a c? thu?c trong ??n</td>
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
