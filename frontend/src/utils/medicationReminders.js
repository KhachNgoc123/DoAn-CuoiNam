/**
 * Tiện ích xử lý trạng thái và nhật ký nhắc uống thuốc.
 */

export const REMINDER_STATUS = {
  reminded: 'Đã nhắc',
  taken: 'Đã uống',
  missed: 'Bỏ lỡ',
  pending: 'Chờ uống',
  outOfSchedule: 'Đã uống',
}

/**
 * Hàm tiện ích todayApiDate dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function todayApiDate() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

/**
 * Hàm tiện ích groupReminderLogsBySchedule dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function groupReminderLogsBySchedule(logs = []) {
  return logs.reduce((grouped, log) => {
    if (!log.schedule_id) return grouped
    const key = String(log.schedule_id)
    grouped.set(key, [...(grouped.get(key) || []), log])
    return grouped
  }, new Map())
}

/**
 * Hàm tiện ích isDateWithinSchedule dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function isDateWithinSchedule(schedule, date = todayApiDate()) {
  const startDate = String(schedule?.start_date || '').slice(0, 10)
  const endDate = String(schedule?.end_date || '').slice(0, 10)

  if (startDate && date < startDate) return false
  if (endDate && date > endDate) return false
  return true
}

/**
 * Hàm tiện ích reminderStatusForSchedule dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function reminderStatusForSchedule(schedule, logsBySchedule, date = todayApiDate()) {
  const logs = logsBySchedule.get(String(schedule?.schedule_id)) || []

  if (logs.some((log) => log.status === REMINDER_STATUS.taken)) return REMINDER_STATUS.taken
  if (logs.some((log) => log.status === REMINDER_STATUS.missed)) return REMINDER_STATUS.missed
  if (logs.some((log) => log.status === REMINDER_STATUS.reminded)) return REMINDER_STATUS.pending
  if (isDateWithinSchedule(schedule, date)) return REMINDER_STATUS.pending

  const startDate = String(schedule?.start_date || '').slice(0, 10)
  const endDate = String(schedule?.end_date || '').slice(0, 10)
  if (startDate && date < startDate) return REMINDER_STATUS.pending
  if (endDate && date > endDate) return REMINDER_STATUS.taken
  return REMINDER_STATUS.pending
}
