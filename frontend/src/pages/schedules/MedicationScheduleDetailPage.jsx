/**
 * File thuộc nhóm pages, điều phối dữ liệu của từng màn hình trước khi truyền xuống component hiển thị.
 */

import { useEffect, useMemo, useState } from 'react'
/* eslint-disable react-hooks/set-state-in-effect */
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CirclePause, HeartPulse, Pencil, Send } from 'lucide-react'
import { createOne, getList, getOne, updateOne } from '../../api/resources'
import { getErrorMessage } from '../../api/client'
import LoadingState from '../../components/ui/LoadingState'
import EmptyState from '../../components/ui/EmptyState'
import Toast from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import StatusBadge from '../../components/ui/StatusBadge'
import { formatDate, formatPatientCode, statusAfterEndDate } from '../../utils/formatters'
import { todayApiDate } from '../../utils/medicationReminders'

function scheduleId(schedule) {
  return schedule?.schedule_id ?? schedule?.id
}

function scheduleDetail(schedule) {
  return schedule?.prescription_detail || schedule?.prescriptionDetail || schedule?.detail || {}
}

function schedulePrescription(schedule) {
  return scheduleDetail(schedule).prescription || schedule?.prescription || {}
}

function scheduleRecord(schedule) {
  return schedulePrescription(schedule).medical_record || schedulePrescription(schedule).medicalRecord || {}
}

function schedulePatient(schedule) {
  return schedule?.patient || scheduleRecord(schedule).patient || {}
}

function scheduleMedicine(schedule) {
  return schedule?.medicine_name || scheduleDetail(schedule).medicine?.medicine_name || scheduleDetail(schedule).medicine_name || 'Thuốc trong toa'
}

function scheduleDosage(schedule) {
  return schedule?.dosage || scheduleDetail(schedule).dosage || '1 viên'
}

function scheduleFrequency(schedule) {
  return scheduleDetail(schedule).frequency_type?.type_name || scheduleDetail(schedule).frequency_type?.frequency_name || schedule?.frequency || '1 lần/ngày'
}

function scheduleMeal(schedule) {
  return schedule?.meal_time_name || scheduleDetail(schedule).meal_time?.meal_time_name || scheduleDetail(schedule).meal_time_name || 'Sau ăn'
}

function scheduleTimes(schedule) {
  const rawTimes = schedule?.times || schedule?.schedule_times || schedule?.scheduleTimes || schedule?.time_take || []
  const list = Array.isArray(rawTimes) ? rawTimes : [rawTimes]
  return list
    .map((time) => ({
      id: time?.schedule_time_id ?? time?.id ?? null,
      time: String(time?.time_take || time?.time || time || '').slice(0, 5),
    }))
    .filter((time) => time.time)
}

function sessionFromTime(time) {
  const hour = Number(String(time).slice(0, 2))
  if (!Number.isFinite(hour)) return 'Sáng'
  if (hour < 11) return 'Sáng'
  if (hour < 14) return 'Trưa'
  if (hour < 18) return 'Chiều'
  return 'Tối'
}

function scheduleSessions(times) {
  const sessions = times.map((item) => sessionFromTime(item.time)).filter(Boolean)
  return [...new Set(sessions)].join(', ')
}

function scheduleReminderStatus(schedule) {
  const activeStatuses = ['Đang hoạt động', 'Đang sử dụng', 'Đang dùng', 'Đang uống', 'active']
  const completedStatuses = ['completed', 'Đã xong', 'Hoàn thành', 'Hoàn tất', 'Đã uống']
  const status = statusAfterEndDate(schedule || {}, activeStatuses)
  const prescriptionStatus = statusAfterEndDate(schedulePrescription(schedule) || {}, activeStatuses)
  if (completedStatuses.includes(status) || completedStatuses.includes(prescriptionStatus)) return 'Đã uống'
  if (status === 'Bỏ lỡ') return 'Bỏ lỡ'
  return 'Chờ uống'
}

function reminderLogDisplayStatus(log) {
  if (!log) return 'Chờ uống'
  if (log.status === 'Đã uống' || log.taken_at) return 'Đã uống'
  if (log.status === 'Bỏ lỡ' || log.missed_at) return 'Bỏ lỡ'
  return 'Chờ uống'
}

function latestReminderText(log) {
  if (!log?.reminded_at && !log?.reminder_time) return 'Chưa gửi'
  const time = log.reminded_at
    ? new Date(log.reminded_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : String(log.reminder_time).slice(0, 5)
  return `Hôm nay, ${time}`
}

/**
 * Hiển thị component InfoItem trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.label Giá trị label được dùng để render hoặc xử lý tương tác.
 * @param {*} props.value Giá trị value được dùng để render hoặc xử lý tương tác.
 */
function InfoItem({ label, value }) {
  return (
    <div className="schedule-detail-info-item">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

/**
 * ?i?u ph?i d? li?u v? hi?n th? m?n h?nh MedicationScheduleDetail.
 */
export default function MedicationScheduleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [schedule, setSchedule] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [sending, setSending] = useState(false)

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    let active = true
    setLoading(true)
    getOne('/medicine-schedules', id)
      .then((data) => {
        if (active) setSchedule(data)
      })
      .catch(() => {
        if (active) setSchedule(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    let active = true
    getList('/medication-reminder-logs', {
      schedule_id: id,
      from_date: todayApiDate(),
      to_date: todayApiDate(),
      per_page: 20,
    })
      .then((result) => {
        if (active) setLogs(result.items || [])
      })
      .catch(() => {
        if (active) setLogs([])
      })

    return () => {
      active = false
    }
  }, [id])

  const patient = schedule ? schedulePatient(schedule) : {}
  const record = schedule ? scheduleRecord(schedule) : {}
  const prescription = schedule ? schedulePrescription(schedule) : {}
  const times = useMemo(() => scheduleTimes(schedule || {}), [schedule])
  const latestLog = logs[0]

  async function sendReminderAgain() {
    if (!schedule) return
    const firstTime = times[0]
    if (!firstTime?.time) {
      setToast({ type: 'error', message: 'Lịch chưa có giờ uống.' })
      return
    }

    try {
      setSending(true)
      await createOne('/medication-reminder-logs', {
        schedule_id: scheduleId(schedule),
        schedule_time_id: firstTime.id,
        reminder_date: todayApiDate(),
        reminder_time: firstTime.time,
        note: 'Bác sĩ gửi nhắc lại người bệnh uống thuốc.',
      })
      setToast({ type: 'success', message: 'Đã gửi nhắc lại.' })
      const result = await getList('/medication-reminder-logs', {
        schedule_id: id,
        from_date: todayApiDate(),
        to_date: todayApiDate(),
        per_page: 20,
      })
      setLogs(result.items || [])
    } catch (requestError) {
      setToast({ type: 'error', message: getErrorMessage(requestError) })
    } finally {
      setSending(false)
    }
  }

  async function confirmScheduleAction() {
    if (!pendingAction || !schedule) return
    try {
      const nextSchedule = await updateOne('/medicine-schedules', scheduleId(schedule), { status: 'Tạm ngưng' })
      setSchedule(nextSchedule)
      setPendingAction(null)
      setToast({ type: 'success', message: 'Đã tạm ngưng lịch uống thuốc.' })
    } catch (requestError) {
      setToast({ type: 'error', message: getErrorMessage(requestError) })
    }
  }

  if (loading) {
    return (
      <main className="page">
        <LoadingState />
      </main>
    )
  }

  if (!schedule) {
    return (
      <main className="page">
        <EmptyState title="Không tìm thấy lịch uống thuốc" />
      </main>
    )
  }

  return (
    <main className="page mc-schedule-detail-page">
      <section className="mc-detail-hero">
        <div>
          <h1>Chi tiết lịch uống thuốc</h1>
          <p>LU-{String(scheduleId(schedule)).padStart(3, '0')} • {patient.full_name || '-'}</p>
        </div>
        <div className="mc-detail-actions">
          <button className="secondary-button" onClick={() => navigate('/schedules')}>
            <ArrowLeft size={17} /> Quay lại
          </button>
          <button
            className="secondary-button"
            onClick={() =>
              navigate('/schedules/create', {
                state: {
                  mode: 'createFromPrescription',
                  prescriptionId: prescription.prescription_id,
                  prescriptionDetailId: scheduleDetail(schedule).prescription_detail_id,
                },
              })
            }
          >
            <Pencil size={17} /> Cập nhật
          </button>
          <button
            className="secondary-button"
            onClick={() =>
              navigate('/health-metrics', {
                state: {
                  healthView: 'detail',
                  patientId: patient.patient_id,
                  prescriptionId: prescription.prescription_id,
                  returnTo: `/schedules/${scheduleId(schedule)}`,
                },
              })
            }
          >
            <HeartPulse size={17} /> Theo dõi sức khỏe
          </button>
          <button className="rx-warning-button" onClick={() => setPendingAction('pause')}>
            <CirclePause size={17} /> Tạm ngưng
          </button>
          <button className="primary-button" onClick={sendReminderAgain} disabled={sending}>
            <Send size={17} /> {sending ? 'Đang gửi...' : 'Gửi nhắc lại'}
          </button>
        </div>
      </section>

      <section className="schedule-detail-layout">
        <article className="schedule-detail-card schedule-detail-main-card">
          <div className="schedule-detail-title-row">
            <h2>Thông tin lịch uống</h2>
            <StatusBadge value={scheduleReminderStatus(schedule)} />
          </div>
          <div className="schedule-detail-info-grid">
            <InfoItem label="Bệnh nhân" value={patient.full_name} />
            <InfoItem label="Mã bệnh nhân" value={formatPatientCode(patient)} />
            <InfoItem label="Hồ sơ bệnh án" value={record.record_code || `HS-${String(record.record_id || '').padStart(3, '0')}`} />
            <InfoItem label="Đơn thuốc" value={prescription.prescription_code || `DT${String(prescription.prescription_id || '').padStart(3, '0')}`} />
            <InfoItem label="Thuốc" value={scheduleMedicine(schedule)} />
            <InfoItem label="Liều lượng" value={scheduleDosage(schedule)} />
            <InfoItem label="Tần suất" value={scheduleFrequency(schedule)} />
            <InfoItem label="Buổi uống" value={scheduleSessions(times)} />
            <InfoItem label="Thời điểm uống" value={scheduleMeal(schedule)} />
            <InfoItem label="Thời gian điều trị" value={`${formatDate(schedule.start_date)} – ${formatDate(schedule.end_date)}`} />
          </div>
        </article>

        <article className="schedule-detail-card schedule-reminder-card">
          <h2>Nhắc uống thuốc</h2>
          <div className="schedule-reminder-info">
            <InfoItem label="Lần nhắc gần nhất" value={latestReminderText(latestLog)} />
            <InfoItem label="Trạng thái nhắc" value={reminderLogDisplayStatus(latestLog)} />
            <InfoItem label="Số lần đã nhắc" value={String(logs.length)} />
            <InfoItem label="Bệnh nhân xác nhận" value={latestLog?.confirmed_at ? new Date(latestLog.confirmed_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Chưa xác nhận'} />
          </div>
        </article>
      </section>

      <section className="schedule-detail-card schedule-history-detail-card">
        <h2>Lịch sử nhắc thuốc</h2>
        {logs.length ? (
          <div className="schedule-history-list">
            {logs.map((log, index) => (
              <div className="schedule-history-row" key={log.id || log.log_id || index}>
                <span>{index + 1}</span>
                <strong>{String(log.reminder_time || times[0]?.time || '').slice(0, 5) || '-'}</strong>
                <small>{log.reminded_at ? new Date(log.reminded_at).toLocaleString('vi-VN') : 'Chưa có giờ gửi'}</small>
                <StatusBadge value={reminderLogDisplayStatus(log)} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có lịch sử nhắc thuốc" />
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title="Tạm ngưng lịch uống thuốc?"
        description="Lịch sẽ chuyển sang trạng thái Tạm ngưng và không bị xóa khỏi hệ thống."
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmScheduleAction}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
