import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import useResourceList from '../api/useResourceList'
import { createOne, getList, updateOne } from '../api/resources'
import { getErrorMessage } from '../api/client'
import MedicationSchedulesView from '../components/schedules/MedicationSchedulesView'
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
    'Thuá»‘c trong toa'
  )
}

function scheduleDosage(schedule) {
  return schedule?.dosage || scheduleDetail(schedule).dosage || '1 viÃªn'
}

function scheduleMeal(schedule) {
  return (
    schedule?.meal_time_name ||
    scheduleDetail(schedule).meal_time?.meal_time_name ||
    scheduleDetail(schedule).meal_time_name ||
    'Sau Äƒn'
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
  if (!Number.isFinite(hour)) return 'SÃ¡ng'
  if (hour < 11) return 'SÃ¡ng'
  if (hour < 14) return 'TrÆ°a'
  if (hour < 18) return 'Chiá»u'
  return 'Tá»‘i'
}

function scheduleStatus(schedule) {
  const activeStatuses = ['Äang hoáº¡t Ä‘á»™ng', 'Äang sá»­ dá»¥ng', 'Äang dÃ¹ng', 'Äang uá»‘ng', 'active']
  const completedStatuses = ['completed', 'ÄÃ£ xong', 'HoÃ n thÃ nh', 'HoÃ n táº¥t', 'ÄÃ£ uá»‘ng']
  const status = statusAfterEndDate(schedule || {}, activeStatuses)
  const prescriptionStatus = statusAfterEndDate(schedulePrescription(schedule) || {}, activeStatuses)
  if (completedStatuses.includes(status) || completedStatuses.includes(prescriptionStatus)) return 'ÄÃ£ uá»‘ng'
  if (activeStatuses.includes(status)) return 'Äang hoáº¡t Ä‘á»™ng'
  return status || 'Äang hoáº¡t Ä‘á»™ng'
}

function minutesSinceTime(date, time) {
  if (!date || !time || time === '--:--') return null
  const target = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}`)
  if (Number.isNaN(target.getTime())) return null
  return Math.floor((Date.now() - target.getTime()) / 60000)
}

function reminderAvailability(schedule, date) {
  const firstTime = scheduleTimeEntries(schedule)[0]
  if (!firstTime?.time) return { allowed: false, label: 'ChÆ°a cÃ³ giá» uá»‘ng', time: null, timeId: null }

  const diff = minutesSinceTime(date, firstTime.time)
  if (diff === null) return { allowed: false, label: 'ChÆ°a xÃ¡c Ä‘á»‹nh giá»', time: firstTime.time, timeId: firstTime.id }
  if (diff < 15) return { allowed: false, label: 'Chá» uá»‘ng', time: firstTime.time, timeId: firstTime.id }
  if (diff > 60) return { allowed: false, label: 'QuÃªn nháº¯c', time: firstTime.time, timeId: firstTime.id }
  return { allowed: true, label: 'Gá»­i nháº¯c', time: firstTime.time, timeId: firstTime.id }
}

function reminderDisplayStatus(schedule, date) {
  const status = scheduleStatus(schedule)
  if (status === 'ÄÃ£ uá»‘ng' || status === 'Bá» lá»¡') return status
  return reminderAvailability(schedule, date).label === 'QuÃªn nháº¯c' ? 'Bá» lá»¡' : 'Chá» uá»‘ng'
}

function reminderSendStatus(schedule, logs, date) {
  const id = String(scheduleId(schedule) || '')
  const hasSentLog = asArray(logs).some((log) => {
    const logScheduleId = String(log?.schedule_id || log?.medicine_schedule_id || log?.schedule?.schedule_id || '')
    const logDate = String(log?.reminder_date || log?.date || log?.created_at || '').slice(0, 10)
    return logScheduleId === id && (!logDate || logDate === date)
  })
  if (hasSentLog) return 'ÄÃ£ gá»­i'
  return reminderAvailability(schedule, date).label === 'QuÃªn nháº¯c' ? 'Gá»­i lá»—i' : 'ChÆ°a gá»­i'
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

export default function MedicationSchedulesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const defaultDate = todayApiDate()
  const routedPatientId = location.state?.patientId || searchParams.get('patient_id') || ''
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

  const activeCount = rows.filter((schedule) => scheduleStatus(schedule) === 'Äang hoáº¡t Ä‘á»™ng').length
  const missedCount = rows.filter((schedule) => reminderDisplayStatus(schedule, selectedDate) === 'Bá» lá»¡').length
  const takenCount = rows.filter((schedule) => reminderDisplayStatus(schedule, selectedDate) === 'ÄÃ£ uá»‘ng').length

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
    window.queueMicrotask(() => loadReminderLogs())
  }, [loadReminderLogs])

  function exportExcel() {
    downloadStyledExcel(`lich-uong-thuoc-${selectedDate}.xls`, {
      title: 'Lá»‹ch uá»‘ng vÃ  nháº¯c thuá»‘c',
      rows: [
        ['Lá»‹ch uá»‘ng vÃ  nháº¯c thuá»‘c'],
        ['NgÃ y uá»‘ng', formatExcelDate(selectedDate)],
        [],
        ['STT', 'MÃ£ BN', 'Bá»‡nh nhÃ¢n', 'Thuá»‘c', 'Giá» uá»‘ng', 'Buá»•i', 'Liá»u lÆ°á»£ng', 'Bá»¯a Äƒn', 'Tráº¡ng thÃ¡i'],
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
        note: 'BÃ¡c sÄ© Ä‘Ã£ gá»­i nháº¯c ngÆ°á»i bá»‡nh uá»‘ng thuá»‘c.',
      })
      setToast({ type: 'success', message: 'ÄÃ£ gá»­i nháº¯c uá»‘ng thuá»‘c cho ngÆ°á»i bá»‡nh.' })
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
      await updateOne('/medicine-schedules', scheduleId(canceling), { status: 'Táº¡m ngÆ°ng' })
      setToast({ type: 'success', message: 'ÄÃ£ táº¡m ngÆ°ng lá»‹ch uá»‘ng thuá»‘c.' })
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
        navigate('/schedules', {
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
