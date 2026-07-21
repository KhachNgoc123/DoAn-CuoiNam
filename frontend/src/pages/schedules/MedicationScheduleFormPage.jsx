/**
 * File thuộc nhóm pages, điều phối dữ liệu của từng màn hình trước khi truyền xuống component hiển thị.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createOne, getList, getOne, updateOne } from '../../api/resources'
import { getErrorMessage } from '../../api/client'
import PageHeader from '../../components/ui/PageHeader'
import LoadingState from '../../components/ui/LoadingState'
import MedicationScheduleForm from '../../components/schedules/MedicationScheduleForm'
import Toast from '../../components/ui/Toast'
import { formatDate, formatPatientCode } from '../../utils/formatters'

const doseSessions = [
  { key: 'morning', label: 'Sáng', time: '08:00' },
  { key: 'noon', label: 'Trưa', time: '12:00' },
  { key: 'afternoon', label: 'Chiều', time: '19:00' },
]

function collectPrescriptionDetails(prescriptions) {
  return prescriptions.flatMap((prescription) =>
    (prescription.details || []).map((detail) => ({
      ...detail,
      prescription,
    })),
  )
}

function frequencyId(item) {
  return item?.frequency_id || item?.frequency_type_id || ''
}

function frequencyLabel(item) {
  return item?.type_name || item?.frequency_name || ''
}

function mealLabel(item) {
  return item?.meal_time_name || ''
}

function dateRange(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return []
  const dates = []
  const current = new Date(start)
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function scheduleEndDate(startDate, endDate) {
  return endDate || startDate
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateValue
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function defaultSessionKeys(detail) {
  const timesPerDay = Number(detail.frequency_type?.times_per_day || 1)
  if (timesPerDay <= 1) return ['morning']
  if (timesPerDay === 2) return ['morning', 'afternoon']
  return ['morning', 'noon', 'afternoon']
}

function buildInitialDetailSchedules(details) {
  return Object.fromEntries(
    details.map((detail) => {
      const selectedSessions = defaultSessionKeys(detail)
      return [
        detail.prescription_detail_id,
        {
          selectedSessions,
          times: Object.fromEntries(
            doseSessions.map((session) => [
              session.key,
              selectedSessions.includes(session.key) ? session.time : '',
            ]),
          ),
        },
      ]
    }),
  )
}

export function PrescriptionScheduleBuilder({ prescription, prescriptionDetailId = null, loading, onSubmit, onCancel }) {
  const details = prescriptionDetailId
    ? (prescription?.details || []).filter((detail) => String(detail.prescription_detail_id) === String(prescriptionDetailId))
    : (prescription?.details || [])
  const patient = prescription?.medical_record?.patient || {}
  const doctor = prescription?.medical_record?.doctor || {}
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [detailSchedules, setDetailSchedules] = useState(() => buildInitialDetailSchedules(details))
  const [note, setNote] = useState(prescription?.note || '')
  const [remindOnTime, setRemindOnTime] = useState(true)
  const [remindBefore, setRemindBefore] = useState(true)
  const [remindBeforeMinutes, setRemindBeforeMinutes] = useState(15)
  const [repeatIfUnconfirmed, setRepeatIfUnconfirmed] = useState(false)

  const prescriptionDate = String(prescription?.prescription_date || prescription?.start_date || '').slice(0, 10)
  const startDate = addDays(prescriptionDate, 1)
  const prescriptionEndDate = String(prescription?.end_date || prescription?.prescription_date || prescription?.start_date || '').slice(0, 10)
  const endDate = scheduleEndDate(startDate, prescriptionEndDate)
  const previewRows = dateRange(startDate, endDate).flatMap((date) =>
    details.flatMap((detail) => {
      const item = detailSchedules[detail.prescription_detail_id] || { selectedSessions: [], times: {} }
      return item.selectedSessions
        .map((sessionKey) => item.times[sessionKey])
        .filter(Boolean)
        .map((time) => ({
          date,
          time,
          medicine: detail.medicine?.medicine_name || `Thuốc #${detail.prescription_detail_id}`,
        }))
    }),
  )

  function setSessionTime(detailId, sessionKey, value) {
    setDetailSchedules((current) => ({
      ...current,
      [detailId]: {
        ...(current[detailId] || { selectedSessions: [], times: {} }),
        times: {
          ...(current[detailId]?.times || {}),
          [sessionKey]: value,
        },
      },
    }))
  }

  function submit(event) {
    event.preventDefault()
    const schedules = details.map((detail) => {
      const item = detailSchedules[detail.prescription_detail_id] || { selectedSessions: [], times: {} }
      return {
        prescription_detail_id: detail.prescription_detail_id,
        frequency_type_id: frequencyId(detail.frequency_type),
        meal_time_id: detail.meal_time?.meal_time_id || '',
        start_date: startDate,
        end_date: endDate,
        note,
        reminder_settings: {
          remind_on_time: remindOnTime,
          remind_before: remindBefore,
          remind_before_minutes: remindBefore ? Number(remindBeforeMinutes || 0) : 0,
          repeat_if_unconfirmed: repeatIfUnconfirmed,
        },
        times: item.selectedSessions
          .map((sessionKey) => item.times[sessionKey])
          .filter(Boolean),
      }
    }).filter((schedule) => schedule.times.length)

    onSubmit(schedules)
  }

  return (
    <form className="prescription-schedule-builder" onSubmit={submit}>
      <section className="panel prescription-schedule-section">
        <div className="panel-heading centered-heading">
          <h2>Tạo lịch nhắc uống thuốc</h2>
        </div>

        <div className="prescription-schedule-block">
          <h3>Thông tin bệnh nhân</h3>
          <div className="prescription-schedule-grid">
            <span>Mã bệnh nhân</span>
            <strong>{formatPatientCode(patient)}</strong>
            <span>Họ tên</span>
            <strong>{patient.full_name || '-'}</strong>
            <span>SĐT</span>
            <strong>{patient.phone || '-'}</strong>
          </div>
        </div>

        <div className="prescription-schedule-block">
          <h3>Thông tin toa thuốc</h3>
          <div className="prescription-schedule-grid">
            <span>Mã toa</span>
            <strong>TOA-{String(prescription.prescription_id || '').padStart(3, '0')}</strong>
            <span>Ngày kê</span>
            <strong>{formatDate(prescription.prescription_date || prescription.start_date)}</strong>
            <span>Bác sĩ</span>
            <strong>{doctor.full_name || 'Bác sĩ phụ trách'}</strong>
          </div>
        </div>

        <div className="prescription-schedule-block">
          <h3>Danh sách thuốc</h3>
          <div className="prescription-schedule-medicine-list">
            {details.map((detail) => {
              const schedule = detailSchedules[detail.prescription_detail_id] || { selectedSessions: [], times: {} }
              return (
                <article className="prescription-schedule-medicine-card" key={detail.prescription_detail_id}>
                  <div className="prescription-readonly-medicine">
                  <strong>- {detail.medicine?.medicine_name || `Thuốc #${detail.prescription_detail_id}`}</strong>
                    <span>Liều dùng</span>
                    <p>{detail.dosage || '-'}</p>
                    <span>Tần suất</span>
                    <p>{frequencyLabel(detail.frequency_type) || '-'}</p>
                    <span>Buổi uống</span>
                    <p>{schedule.selectedSessions.map((key) => doseSessions.find((session) => session.key === key)?.label).filter(Boolean).join(', ') || '-'}</p>
                    <span>Bữa ăn</span>
                    <p>{mealLabel(detail.meal_time) || '-'}</p>
                    <span>Ngày bắt đầu</span>
                    <p>{formatDate(startDate)}</p>
                    <span>Ngày kết thúc</span>
                    <p>{formatDate(endDate)}</p>
                  </div>
                  <h4>Điều chỉnh giờ uống</h4>
                  <div className="prescription-session-row">
                    <span>Giờ nhắc</span>
                    {doseSessions
                      .filter((session) => schedule.selectedSessions.includes(session.key))
                      .map((session) => (
                        <label className="schedule-time-edit-field" key={session.key}>
                          {session.label}
                          <input
                            type="time"
                            value={schedule.times[session.key] || session.time}
                            onChange={(event) =>
                              setSessionTime(detail.prescription_detail_id, session.key, event.target.value)
                            }
                            required
                          />
                        </label>
                      ))}
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        <div className="prescription-schedule-block">
          <h3>Thời gian điều trị</h3>
          <div className="prescription-schedule-grid">
            <span>Ngày bắt đầu</span>
            <strong>{formatDate(startDate)}</strong>
            <span>Ngày kết thúc</span>
            <strong>{formatDate(endDate)}</strong>
          </div>
        </div>

        <div className="prescription-schedule-block">
          <h3>Thiết lập nhắc</h3>
          <div className="prescription-reminder-options">
            <label>
              <input type="checkbox" checked={remindOnTime} onChange={(event) => setRemindOnTime(event.target.checked)} />
              Nhắc đúng giờ
            </label>
            <label>
              <input type="checkbox" checked={remindBefore} onChange={(event) => setRemindBefore(event.target.checked)} />
              Nhắc trước
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={remindBeforeMinutes}
              disabled={!remindBefore}
              onChange={(event) => setRemindBeforeMinutes(event.target.value)}
            />
            <span>phút</span>
            <label>
              <input
                type="checkbox"
                checked={repeatIfUnconfirmed}
                onChange={(event) => setRepeatIfUnconfirmed(event.target.checked)}
              />
              Nhắc lại nếu chưa xác nhận
            </label>
          </div>
        </div>

        <div className="prescription-schedule-block">
          <h3>Ghi chú</h3>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} />
        </div>

        <div className="prescription-schedule-block">
          <h3>Xem trước lịch nhắc</h3>
          <div className="schedule-preview-list">
            {previewRows.slice(0, 12).map((row, index) => (
              <div key={`${row.date}-${row.time}-${row.medicine}-${index}`}>
                <span>{formatDate(row.date)}</span>
                <strong>{row.time}</strong>
                <small>{row.medicine}</small>
              </div>
            ))}
          </div>
          <strong className="schedule-preview-total">Tổng cộng: {previewRows.length} lần nhắc</strong>
        </div>

        <div className="form-actions centered-actions">
          <button className="primary-button" disabled={loading || !details.length}>
            {loading ? 'Đang lưu...' : 'Lưu lịch nhắc'}
          </button>
          <button type="button" className="secondary-button" onClick={onCancel}>
            Hủy
          </button>
        </div>
      </section>
    </form>
  )
}

/**
 * Điều phối dữ liệu và hiển thị màn hình MedicationScheduleForm.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.mode Giá trị mode được dùng để render hoặc xử lý tương tác.
 * @param {*} props.prescriptionId Giá trị prescriptionId được dùng để render hoặc xử lý tương tác.
 * @param {*} props.prescriptionDetailId Giá trị prescriptionDetailId được dùng để render hoặc xử lý tương tác.
 */
export default function MedicationScheduleFormPage({ mode, prescriptionId, prescriptionDetailId }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = mode === 'edit' || Boolean(id)
  const [initialValue, setInitialValue] = useState(null)
  const [prescription, setPrescription] = useState(null)
  const [details, setDetails] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    Promise.all([
      prescriptionId ? Promise.resolve({ items: [] }) : getList('/prescriptions', { per_page: 50, status: 'active' }),
      isEdit ? getOne('/medicine-schedules', id) : Promise.resolve(null),
      prescriptionId ? getOne('/prescriptions', prescriptionId) : Promise.resolve(null),
    ])
      .then(([prescriptionResult, schedule, selectedPrescription]) => {
        const prescriptionDetails = selectedPrescription
          ? (selectedPrescription.details || []).map((detail) => ({ ...detail, prescription: selectedPrescription }))
          : collectPrescriptionDetails(prescriptionResult.items)
        if (
          schedule?.prescription_detail &&
          !prescriptionDetails.some(
            (detail) =>
              detail.prescription_detail_id === schedule.prescription_detail.prescription_detail_id,
          )
        ) {
          prescriptionDetails.push(schedule.prescription_detail)
        }
        setPrescription(selectedPrescription)
        setDetails(prescriptionDetails)
        setInitialValue(schedule)
      })
      .catch((error) => setToast({ type: 'error', message: getErrorMessage(error) }))
      .finally(() => setLoading(false))
  }, [id, isEdit, prescriptionId])

  async function submit(payload) {
    setSaving(true)
    try {
      await (isEdit
        ? updateOne('/medicine-schedules', id, payload)
        : createOne('/medicine-schedules', payload))
      navigate('/schedules', {
        state: {
          toast: { type: 'success', message: isEdit ? 'Đã cập nhật lịch.' : 'Đã thêm lịch.' },
        },
      })
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  // Hàm submitPrescriptionSchedules gửi dữ liệu mới lên API hoặc component cha.
  async function submitPrescriptionSchedules(schedules) {
    if (!schedules.length) {
      setToast({ type: 'error', message: 'Vui lòng chọn ít nhất một giờ uống thuốc.' })
      return
    }
    setSaving(true)
    try {
      await Promise.all(schedules.map((schedule) => createOne('/medicine-schedules', schedule)))
      navigate('/schedules', {
        state: {
          toast: { type: 'success', message: 'Đã tạo lịch nhắc uống thuốc cho toa thuốc.' },
          prescriptionId: prescription?.prescription_id,
        },
      })
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="page">
        <LoadingState />
      </main>
    )
  }

  return (
    <main className="page">
      <PageHeader
        title={prescription ? 'Tạo lịch nhắc uống thuốc' : isEdit ? 'Sửa lịch uống thuốc' : 'Thêm lịch uống thuốc'}
        subtitle="Lưu vào medicine_schedules và schedule_times."
        actions={
          <button className="secondary-button" onClick={() => navigate('/schedules')}>
            <ArrowLeft size={18} /> Quay lại
          </button>
        }
      />
      {prescription ? (
        <PrescriptionScheduleBuilder
          prescription={prescription}
          prescriptionDetailId={prescriptionDetailId}
          loading={saving}
          onSubmit={submitPrescriptionSchedules}
          onCancel={() => navigate('/schedules')}
        />
      ) : (
        <section className="panel">
          <MedicationScheduleForm
            initialValue={initialValue}
            prescriptionDetails={details}
            loading={saving}
            onSubmit={submit}
            onCancel={() => navigate('/schedules')}
          />
        </section>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
