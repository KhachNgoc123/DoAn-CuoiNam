import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, FileSpreadsheet, Pencil, Plus, Search, Send, CirclePause } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import useResourceList from '../api/useResourceList'
import { createOne, getList, updateOne } from '../api/resources'
import { getErrorMessage } from '../api/client'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Toast from '../components/ui/Toast'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import { downloadStyledExcel } from '../utils/excelExport'
import { formatPatientCode, statusAfterEndDate } from '../utils/formatters'
import { todayApiDate } from '../utils/medicationReminders'

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

function reminderDisplayStatus(schedule, date) {
  const status = scheduleStatus(schedule)
  if (status === 'Đã uống' || status === 'Bỏ lỡ') return status
  return reminderAvailability(schedule, date).label === 'Quên nhắc' ? 'Bỏ lỡ' : 'Chờ uống'
}

function patientSearchText(schedule) {
  const patient = schedulePatient(schedule)
  return [patient.patient_id, patient.full_name, patient.phone, scheduleMedicine(schedule)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
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

function formatExcelDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('vi-VN')
}

export default function MedicationSchedulesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const defaultDate = todayApiDate()
  const routedPatientId = location.state?.patientId || searchParams.get('patient_id') || ''
  const [statusFilter, setStatusFilter] = useState('')
  const [sessionFilter, setSessionFilter] = useState('')
  const [medicineFilter, setMedicineFilter] = useState('')
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

  useEffect(() => {
    loadReminderLogs()
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

  function renderTodayScheduleTable() {
    return (
      <div className="table-wrap schedule-today-table-wrap">
        <table className="schedule-today-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã lịch</th>
              <th>Bệnh nhân</th>
              <th>Thuốc</th>
              <th>Giờ uống</th>
              <th>Buổi</th>
              <th>Trạng thái</th>
              <th>Nhắc thuốc</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {todayTableRows.length ? (
              todayTableRows.map((schedule, index) => {
                const patient = schedulePatient(schedule)
                const time = firstScheduleTime(schedule)
                const id = scheduleId(schedule)
                return (
                  <tr key={`${id}-${time}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{scheduleCode(schedule)}</td>
                    <td>{patient.full_name || '-'}</td>
                    <td>{scheduleMedicine(schedule)}</td>
                    <td>{time}</td>
                    <td>{sessionFromTime(time)}</td>
                    <td><StatusBadge value={reminderDisplayStatus(schedule, selectedDate)} /></td>
                    <td><StatusBadge value={reminderSendStatus(schedule, reminderLogs, selectedDate)} /></td>
                    <td>
                      <div className="table-actions schedule-table-actions">
                        <button
                          type="button"
                          className="icon-button"
                          title="Xem chi tiết"
                          onClick={() => navigate(`/schedules/${id}`, { state: { patientId: patient.patient_id } })}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Cập nhật lịch"
                          onClick={() => navigate('/schedules', {
                            state: {
                              mode: 'createFromPrescription',
                              prescriptionId: schedulePrescription(schedule).prescription_id,
                              prescriptionDetailId: scheduleDetail(schedule).prescription_detail_id,
                            },
                          })}
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td className="schedule-table-empty" colSpan={9}>Hôm nay chưa có lịch uống thuốc</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <main className="page mc-schedules-page">
      <section className="mc-list-hero">
        <div>
          <h1>Lịch uống & nhắc thuốc</h1>
          <p>Giám sát lịch dùng thuốc và mức độ tuân thủ</p>
        </div>
        <div className="rx-list-actions">
          <button type="button" className="secondary-button prescription-export-button" onClick={exportExcel}>
            <FileSpreadsheet size={17} /> Excel
          </button>
          <button type="button" className="primary-button" onClick={() => navigate('/prescriptions')}>
            <Plus size={18} /> Tạo lịch
          </button>
        </div>
      </section>

      <section className="schedule-filter-card">
        <label>
          <span>Tìm bệnh nhân</span>
          <input
            value={params.search || ''}
            onChange={(event) => setParams({ search: event.target.value, page: 1, per_page: 20 })}
            placeholder="Mã hoặc họ tên"
          />
        </label>
        <label>
          <span>Trạng thái</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Tất cả</option>
            <option value="Chờ uống">Chờ uống</option>
            <option value="Đã uống">Đã uống</option>
            <option value="Bỏ lỡ">Bỏ lỡ</option>
          </select>
        </label>
        <label>
          <span>Buổi</span>
          <select value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)}>
            <option value="">Tất cả</option>
            <option value="Sáng">Sáng</option>
            <option value="Trưa">Trưa</option>
            <option value="Chiều">Chiều</option>
            <option value="Tối">Tối</option>
          </select>
        </label>
        <label>
          <span>Từ ngày</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setParams({ from_date: event.target.value, to_date: event.target.value, page: 1 })}
          />
        </label>
        <label>
          <span>Đến ngày</span>
          <input
            type="date"
            value={params.to_date || selectedDate}
            onChange={(event) => setParams({ to_date: event.target.value, page: 1 })}
          />
        </label>
        <button type="button" className="mc-search-button" onClick={() => refetch()}>
          <Search size={17} /> Áp dụng
        </button>
      </section>

      <section className="schedule-stat-row">
        <article><span>Tổng lịch</span><strong>{rows.length}</strong></article>
        <article><span>Đang hoạt động</span><strong>{activeCount}</strong></article>
        <article><span>Đã uống</span><strong>{takenCount}</strong></article>
        <article><span>Bỏ lỡ</span><strong>{missedCount}</strong></article>
      </section>

      {error ? (
        <EmptyState title="Không truy xuất được lịch uống thuốc" description={error} />
      ) : (
        <section className="schedule-today-panel">
          <div className="schedule-today-head">
            <div>
              <h2>Hôm nay có lịch nhắc nào?</h2>
              <p>Lịch tiếp theo và trạng thái gửi nhắc</p>
            </div>
          </div>

          {loading ? (
            <p className="schedule-empty-line">Đang tải lịch uống thuốc...</p>
          ) : (
            <>
              {groupedTodayRows.length ? (
                <div className="schedule-reminder-list">
                  {groupedTodayRows.map((group) => {
                    const patient = group.patient
                    const primarySchedule = group.schedules[0]
                    const time = firstScheduleTime(primarySchedule)
                    const reminder = reminderAvailability(primarySchedule, selectedDate)
                    const id = scheduleId(primarySchedule)
                    const medicines = group.schedules.map((schedule) => {
                      const times = scheduleTimeEntries(schedule).map((entry) => entry.time).join(', ')
                      return `${scheduleMedicine(schedule)} (${scheduleDosage(schedule)} - ${times || firstScheduleTime(schedule)})`
                    }).join(' • ')
                    return (
                      <article className="schedule-reminder-row" key={id}>
                        <div className="schedule-time-pill">
                          <strong>{time}</strong>
                          <span>{sessionFromTime(time)}</span>
                        </div>
                        <div className="schedule-reminder-main">
                          <strong>{formatPatientCode(patient)} • {patient.full_name || '-'}</strong>
                          <p>
                            {medicines} • {scheduleMeal(primarySchedule)} • <StatusBadge value={reminderDisplayStatus(primarySchedule, selectedDate)} />
                          </p>
                        </div>
                        <div className="schedule-row-actions">
                          <button type="button" className="secondary-button" onClick={() => navigate(`/schedules/${id}`, { state: { patientId: patient.patient_id } })}>
                            Chi tiết
                          </button>
                          <button type="button" className="secondary-button" onClick={() => navigate('/schedules', {
                            state: {
                              mode: 'createFromPrescription',
                              prescriptionId: schedulePrescription(primarySchedule).prescription_id,
                              prescriptionDetailId: scheduleDetail(primarySchedule).prescription_detail_id,
                            },
                          })}>
                            <Pencil size={16} /> Cập nhật
                          </button>
                          <button type="button" className="rx-warning-button" onClick={() => setCanceling(primarySchedule)}>
                            <CirclePause size={16} /> Tạm ngưng
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            disabled={!reminder.allowed || sendingReminder === id}
                            onClick={() => sendReminder(primarySchedule)}
                          >
                            <Send size={16} /> {sendingReminder === id ? 'Đang gửi...' : 'Gửi nhắc'}
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : null}
            </>
          )}
        </section>
      )}

      {!error ? (
        <section className="mc-table-panel rx-table-panel schedule-today-table-panel">
          {loading ? (
            <p className="schedule-empty-line">Đang tải danh sách lịch uống thuốc...</p>
          ) : (
            renderTodayScheduleTable()
          )}
        </section>
      ) : null}

      <ConfirmDialog
        open={Boolean(canceling)}
        title="Tạm ngưng lịch uống thuốc?"
        description="Lịch sẽ chuyển sang trạng thái Tạm ngưng và vẫn còn lưu trong hệ thống."
        onCancel={() => setCanceling(null)}
        onConfirm={confirmCancel}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
