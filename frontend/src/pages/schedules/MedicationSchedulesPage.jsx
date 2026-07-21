/**
 * File thuộc nhóm pages, điều phối dữ liệu của từng màn hình trước khi truyền xuống component hiển thị.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import useResourceList from '../../api/useResourceList'
import { createOne, getList, updateOne } from '../../api/resources'
import { getErrorMessage } from '../../api/client'
import MedicationSchedulesView from '../../components/schedules/MedicationSchedulesView'
import { downloadStyledExcel } from '../../utils/excelExport'
import { formatPatientCode, statusAfterEndDate } from '../../utils/formatters'
import { todayApiDate } from '../../utils/medicationReminders'

function asArray(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  return [value]
}

function scheduleId(schedule) {
  return schedule?.schedule_id ?? schedule?.id
}

function scheduleCode(schedule) {
  const id = scheduleId(schedule)
  if (!id) return 'LU---'
  const value = String(id)
  return value.startsWith('LU-') ? value : `LU-${value.padStart(3, '0')}`
}

function scheduleDetail(schedule) {
  return schedule?.prescription_detail || schedule?.prescriptionDetail || schedule?.detail || {}
}

function schedulePrescription(schedule) {
  return scheduleDetail(schedule).prescription || schedule?.prescription || {}
}

function schedulePatient(schedule) {
  return (
    schedule?.patient ||
    schedulePrescription(schedule).medical_record?.patient ||
    schedulePrescription(schedule).medicalRecord?.patient ||
    {}
  )
}

function scheduleMedicine(schedule) {
  return (
    schedule?.medicine_name ||
    scheduleDetail(schedule).medicine?.medicine_name ||
    scheduleDetail(schedule).medicine_name ||
    'Thuốc trong toa'
  )
}

function scheduleDosage(schedule) {
  return schedule?.dosage || scheduleDetail(schedule).dosage || '1 viên'
}

function scheduleMeal(schedule) {
  return (
    schedule?.meal_time_name ||
    scheduleDetail(schedule).meal_time?.meal_time_name ||
    scheduleDetail(schedule).meal_time_name ||
    'Sau ăn'
  )
}

function scheduleTimeEntries(schedule) {
  const rawTimes = schedule?.times || schedule?.schedule_times || schedule?.scheduleTimes || schedule?.time_take || []
  return asArray(rawTimes)
    .map((time) => ({
      id: time?.schedule_time_id ?? time?.id ?? null,
      time: String(time?.time_take || time?.time || time || '').slice(0, 5),
    }))
    .filter((time) => time.time)
}

function firstScheduleTime(schedule) {
  return scheduleTimeEntries(schedule)[0]?.time || '--:--'
}

function sessionFromTime(time) {
  const hour = Number(String(time).slice(0, 2))
  if (!Number.isFinite(hour)) return 'Sáng'
  if (hour < 11) return 'Sáng'
  if (hour < 14) return 'Trưa'
  if (hour < 18) return 'Chiều'
  return 'Tối'
}

function scheduleStatus(schedule) {
  const activeStatuses = ['Đang hoạt động', 'Đang sử dụng', 'Đang dùng', 'Đang uống', 'active']
  const completedStatuses = ['completed', 'Đã xong', 'Hoàn thành', 'Hoàn tất', 'Đã uống']
  const status = statusAfterEndDate(schedule || {}, activeStatuses)
  const prescriptionStatus = statusAfterEndDate(schedulePrescription(schedule) || {}, activeStatuses)
  if (completedStatuses.includes(status) || completedStatuses.includes(prescriptionStatus)) return 'Đã uống'
  if (activeStatuses.includes(status)) return 'Đang hoạt động'
  return status || 'Đang hoạt động'
}

function minutesSinceTime(date, time) {
  if (!date || !time || time === '--:--') return null
  const target = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}`)
  if (Number.isNaN(target.getTime())) return null
  return Math.floor((Date.now() - target.getTime()) / 60000)
}

function reminderAvailability(schedule, date) {
  const firstTime = scheduleTimeEntries(schedule)[0]
  if (!firstTime?.time) return { allowed: false, label: 'Chưa có giờ uống', time: null, timeId: null }

  const diff = minutesSinceTime(date, firstTime.time)
  if (diff === null) return { allowed: false, label: 'Chưa xác định giờ', time: firstTime.time, timeId: firstTime.id }
  if (diff < 15) return { allowed: false, label: 'Chờ uống', time: firstTime.time, timeId: firstTime.id }
  if (diff > 60) return { allowed: false, label: 'Quên nhắc', time: firstTime.time, timeId: firstTime.id }
  return { allowed: true, label: 'Gửi nhắc', time: firstTime.time, timeId: firstTime.id }
}

function reminderDisplayStatus(schedule, date) {
  const status = scheduleStatus(schedule)
  if (status === 'Đã uống' || status === 'Bỏ lỡ') return status
  return reminderAvailability(schedule, date).label === 'Quên nhắc' ? 'Bỏ lỡ' : 'Chờ uống'
}

function reminderSendStatus(schedule, logs, date) {
  const id = String(scheduleId(schedule) || '')
  const hasSentLog = asArray(logs).some((log) => {
    const logScheduleId = String(log?.schedule_id || log?.medicine_schedule_id || log?.schedule?.schedule_id || '')
    const logDate = String(log?.reminder_date || log?.date || log?.created_at || '').slice(0, 10)
    return logScheduleId === id && (!logDate || logDate === date)
  })
  if (hasSentLog) return 'Đã gửi'
  return reminderAvailability(schedule, date).label === 'Quên nhắc' ? 'Gửi lỗi' : 'Chưa gửi'
}

function patientSearchText(schedule) {
  const patient = schedulePatient(schedule)
  return [patient.patient_id, patient.full_name, patient.phone, scheduleMedicine(schedule)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function formatExcelDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('vi-VN')
}

/**
 * ?i?u ph?i d? li?u v? hi?n th? m?n h?nh MedicationSchedules.
 */
export default function MedicationSchedulesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const defaultDate = todayApiDate()
  const routedPatientId = location.state?.patientId || searchParams.get('patient_id') || ''
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [statusFilter, setStatusFilter] = useState('')
  const [sessionFilter, setSessionFilter] = useState('')
  const [medicineFilter] = useState('')
  const [canceling, setCanceling] = useState(null)
  const [toast, setToast] = useState(null)
  const [reminderLogs, setReminderLogs] = useState([])
  const [sendingReminder, setSendingReminder] = useState(null)

  const { items, params, setParams, loading, error, refetch } = useResourceList('/medicine-schedules', {
    per_page: 20,
    from_date: defaultDate,
    to_date: defaultDate,
    ...(routedPatientId ? { patient_id: routedPatientId } : {}),
  })

  const selectedDate = params.from_date || defaultDate

  const rows = useMemo(() => {
    const search = String(params.search || '').trim().toLowerCase()
    const medicine = medicineFilter.trim().toLowerCase()
    return asArray(items)
      .filter((schedule) => {
        const time = firstScheduleTime(schedule)
        if (statusFilter && reminderDisplayStatus(schedule, selectedDate) !== statusFilter) return false
        if (sessionFilter && sessionFromTime(time) !== sessionFilter) return false
        if (medicine && !scheduleMedicine(schedule).toLowerCase().includes(medicine)) return false
        return !search || patientSearchText(schedule).includes(search)
      })
      .map((schedule) => ({ ...schedule, id: scheduleId(schedule) }))
  }, [items, params.search, statusFilter, sessionFilter, medicineFilter, selectedDate])

  const todayRows = useMemo(
    () =>
      rows.filter((schedule) => {
        const startDate = String(schedule.start_date || '').slice(0, 10)
        const endDate = String(schedule.end_date || '').slice(0, 10)
        if (startDate && selectedDate < startDate) return false
        if (endDate && selectedDate > endDate) return false
        return true
      }),
    [rows, selectedDate],
  )

  const groupedTodayRows = useMemo(() => {
    const groups = new Map()
    todayRows.forEach((schedule) => {
      const patient = schedulePatient(schedule)
      const key = patient.patient_id || patient.full_name || scheduleId(schedule)
      const current = groups.get(key) || { patient, schedules: [] }
      current.schedules.push(schedule)
      groups.set(key, current)
    })

    return Array.from(groups.values()).sort((left, right) => {
      const leftTime = firstScheduleTime(left.schedules[0])
      const rightTime = firstScheduleTime(right.schedules[0])
      return leftTime.localeCompare(rightTime)
    })
  }, [todayRows])

  const todayTableRows = useMemo(
    () =>
      [...todayRows].sort((left, right) => {
        const leftTime = firstScheduleTime(left)
        const rightTime = firstScheduleTime(right)
        return leftTime.localeCompare(rightTime)
      }),
    [todayRows],
  )

  const activeCount = rows.filter((schedule) => scheduleStatus(schedule) === 'Đang hoạt động').length
  const missedCount = rows.filter((schedule) => reminderDisplayStatus(schedule, selectedDate) === 'Bỏ lỡ').length
  const takenCount = rows.filter((schedule) => reminderDisplayStatus(schedule, selectedDate) === 'Đã uống').length

  // Hàm loadReminderLogs nạp dữ liệu từ API hoặc nguồn dữ liệu hiện có để cập nhật giao diện.
  const loadReminderLogs = useCallback(async () => {
    try {
      const result = await getList('/medication-reminder-logs', {
        from_date: selectedDate,
        to_date: selectedDate,
        per_page: 5,
      })
      setReminderLogs(asArray(result.items))
    } catch {
      setReminderLogs([])
    }
  }, [selectedDate])

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    window.queueMicrotask(() => loadReminderLogs())
  }, [loadReminderLogs])

  function exportExcel() {
    downloadStyledExcel(`lich-uong-thuoc-${selectedDate}.xls`, {
      title: 'Lịch uống và nhắc thuốc',
      rows: [
        ['Lịch uống và nhắc thuốc'],
        ['Ngày uống', formatExcelDate(selectedDate)],
        [],
        ['STT', 'Mã BN', 'Bệnh nhân', 'Thuốc', 'Giờ uống', 'Buổi', 'Liều lượng', 'Bữa ăn', 'Trạng thái'],
        ...todayRows.map((schedule, index) => {
          const patient = schedulePatient(schedule)
          const time = firstScheduleTime(schedule)
          return [
            index + 1,
            formatPatientCode(patient),
            patient.full_name || '',
            scheduleMedicine(schedule),
            time,
            sessionFromTime(time),
            scheduleDosage(schedule),
            scheduleMeal(schedule),
            reminderDisplayStatus(schedule, selectedDate),
          ]
        }),
      ],
    })
  }

  async function sendReminder(schedule) {
    const id = scheduleId(schedule)
    const reminder = reminderAvailability(schedule, selectedDate)
    if (!reminder.allowed) {
      setToast({ type: 'error', message: reminder.label })
      return
    }

    try {
      setSendingReminder(id)
      await createOne('/medication-reminder-logs', {
        schedule_id: id,
        schedule_time_id: reminder.timeId,
        reminder_date: selectedDate,
        reminder_time: reminder.time,
        note: 'Bác sĩ đã gửi nhắc người bệnh uống thuốc.',
      })
      setToast({ type: 'success', message: 'Đã gửi nhắc uống thuốc cho người bệnh.' })
      await loadReminderLogs()
      refetch()
    } catch (requestError) {
      setToast({ type: 'error', message: getErrorMessage(requestError) })
    } finally {
      setSendingReminder(null)
    }
  }

  async function confirmCancel() {
    if (!canceling) return
    try {
      await updateOne('/medicine-schedules', scheduleId(canceling), { status: 'Tạm ngưng' })
      setToast({ type: 'success', message: 'Đã tạm ngưng lịch uống thuốc.' })
      setCanceling(null)
      refetch()
    } catch (requestError) {
      setToast({ type: 'error', message: getErrorMessage(requestError) })
    }
  }

  return (
    <MedicationSchedulesView
      params={params}
      loading={loading}
      error={error}
      toast={toast}
      selectedDate={selectedDate}
      statusFilter={statusFilter}
      sessionFilter={sessionFilter}
      reminderLogs={reminderLogs}
      sendingReminder={sendingReminder}
      canceling={canceling}
      rows={rows}
      groupedTodayRows={groupedTodayRows}
      todayTableRows={todayTableRows}
      activeCount={activeCount}
      missedCount={missedCount}
      takenCount={takenCount}
      scheduleId={scheduleId}
      scheduleCode={scheduleCode}
      schedulePatient={schedulePatient}
      scheduleMedicine={scheduleMedicine}
      scheduleDosage={scheduleDosage}
      scheduleMeal={scheduleMeal}
      scheduleDetail={scheduleDetail}
      schedulePrescription={schedulePrescription}
      scheduleTimeEntries={scheduleTimeEntries}
      firstScheduleTime={firstScheduleTime}
      sessionFromTime={sessionFromTime}
      reminderAvailability={reminderAvailability}
      reminderDisplayStatus={reminderDisplayStatus}
      reminderSendStatus={reminderSendStatus}
      onExportExcel={exportExcel}
      onCreateSchedule={() => navigate('/prescriptions')}
      onSetParams={setParams}
      onStatusFilterChange={setStatusFilter}
      onSessionFilterChange={setSessionFilter}
      onRefetch={refetch}
      onViewSchedule={(id, patient) => navigate(`/schedules/${id}`, { state: { patientId: patient.patient_id } })}
      onEditSchedule={(prescription, detail) =>
        navigate('/schedules/create', {
          state: {
            mode: 'createFromPrescription',
            prescriptionId: prescription.prescription_id,
            prescriptionDetailId: detail.prescription_detail_id,
          },
        })
      }
      onCancelSchedule={setCanceling}
      onSendReminder={sendReminder}
      onCloseCancel={() => setCanceling(null)}
      onConfirmCancel={confirmCancel}
      onCloseToast={() => setToast(null)}
    />
  )
}
