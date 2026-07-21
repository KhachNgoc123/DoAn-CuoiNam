/**
 * Tiện ích xử lý ngày, buổi uống và dữ liệu liên quan đơn thuốc.
 */

import { formatTime } from './formatters'
import { downloadStyledExcel } from './excelExport'

export const DOSE_SESSIONS = [
  { key: 'morning', label: 'S?ng', time: '08:00' },
  { key: 'noon', label: 'Tr?a', time: '12:00' },
  { key: 'afternoon', label: 'Chi?u', time: '17:00' },
]

/**
 * Hàm tiện ích sessionForTime dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function sessionForTime(value) {
  const formatted = formatTime(value)
  const hour = Number(String(formatted).slice(0, 2))
  if (Number.isNaN(hour)) return null
  if (hour < 11) return DOSE_SESSIONS[0]
  if (hour < 16) return DOSE_SESSIONS[1]
  return DOSE_SESSIONS[2]
}

/**
 * Hàm tiện ích getScheduleSessionsFromTimes dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function getScheduleSessionsFromTimes(times = []) {
  const keys = new Set()
  return times
    .map((time) => sessionForTime(time.time_take || time))
    .filter(Boolean)
    .filter((session) => {
      if (keys.has(session.key)) return false
      keys.add(session.key)
      return true
    })
    .sort(
      (left, right) =>
        DOSE_SESSIONS.findIndex((session) => session.key === left.key) -
        DOSE_SESSIONS.findIndex((session) => session.key === right.key),
    )
    .map((session) => session.label)
}

/**
 * Hàm tiện ích getDoseTimes dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function getDoseTimes(detail) {
  return [
    ...new Set(
      (detail.schedules || [])
        .flatMap((schedule) => schedule.times || [])
        .map((time) => formatTime(time.time_take))
        .filter(Boolean),
    ),
  ]
}

/**
 * Hàm tiện ích getDoseSessions dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function getDoseSessions(detail) {
  if (Array.isArray(detail.dose_sessions) && detail.dose_sessions.length) {
    return detail.dose_sessions
  }

  return [
    ...new Set(
      (detail.schedules || [])
        .flatMap((schedule) => getScheduleSessionsFromTimes(schedule.times || []))
        .filter(Boolean),
    ),
  ]
}

/**
 * Hàm tiện ích getDoseCount dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function getDoseCount(detail) {
  const sessions = getDoseSessions(detail)
  return (
    detail.frequency_type?.type_name ||
    detail.frequency_type?.frequency_name ||
    (detail.frequency_type?.times_per_day
      ? `${detail.frequency_type.times_per_day} l?n/ng?y`
      : '') ||
    (sessions.length ? `${sessions.length} l?n/ng?y` : 'Ch?a l?p l?ch')
  )
}

/**
 * Hàm tiện ích getPrescriptionStartDate dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function getPrescriptionStartDate(prescription) {
  return (
    prescription.start_date ||
    prescription.visit_date ||
    prescription.medical_record?.visit_date ||
    ''
  )
}

/**
 * Hàm tiện ích getPrescriptionEndDate dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function getPrescriptionEndDate(prescription) {
  if (prescription.end_date) return prescription.end_date
  return ''
}

function medicineCode(detail) {
  return (
    detail.medicine?.medicine_code ||
    detail.medicine?.code ||
    detail.medicine?.medicine_id ||
    detail.medicine_id ||
    ''
  )
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

function medicineUnit(detail) {
  return detail.unit || detail.medicine?.unit || ''
}

function mealText(detail) {
  const scheduleMeal = (detail.schedules || [])
    .map((schedule) => schedule.meal_time?.meal_time_name || schedule.meal_time_name)
    .filter(Boolean)
    .join(', ')
  return detail.meal_time?.meal_time_name || scheduleMeal || ''
}

function usageText(detail) {
  return [
    detail.dosage || detail.dose || detail.dosage_text,
    getDoseCount(detail),
    mealText(detail),
    getDoseTimes(detail).length ? `giờ ${getDoseTimes(detail).join(', ')}` : '',
    detail.note,
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * Hàm tiện ích exportPrescriptionExcel dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function exportPrescriptionExcel(prescription) {
  const patient = prescription.medical_record?.patient || {}
  const medicalRecord = prescription.medical_record || {}
  const doctor = medicalRecord.doctor || {}
  const rows = [
    ['Thông tin đơn thuốc'],
    ['Mã đơn thuốc', `DT-${String(prescription.prescription_id || '').padStart(6, '0')}`],
    ['Họ tên', patient.full_name || '', 'Ngày sinh', patient.date_of_birth || '', 'Giới tính', patient.gender || ''],
    ['Số điện thoại', patient.phone || '', 'Địa chỉ', patient.address || ''],
    ['Chẩn đoán', medicalRecord.diagnosis || '', 'Bác sĩ', doctor.full_name || ''],
    ['Lưu ý', medicalRecord.allergy || patient.allergy || 'Không'],
    ['Ngày bắt đầu', getPrescriptionStartDate(prescription), 'Ngày kết thúc', getPrescriptionEndDate(prescription)],
    [],
    ['Danh sách thuốc'],
    ['Mã thuốc', 'Hoạt chất', 'Tên thuốc', 'ĐVT', 'SL', 'Cách dùng'],
    ...(prescription.details || []).map((detail, index) => [
      medicineCode(detail) || index + 1,
      medicineActiveIngredient(detail),
      detail.medicine?.medicine_name || '',
      medicineUnit(detail),
      detail.quantity || '',
      usageText(detail),
    ]),
  ]
  downloadStyledExcel(`toa-thuoc-${prescription.prescription_id}.xls`, {
    title: 'Đơn thuốc ngoại trú',
    subtitle: 'BỆNH VIỆN / PHÒNG KHÁM',
    rows,
  })
}
