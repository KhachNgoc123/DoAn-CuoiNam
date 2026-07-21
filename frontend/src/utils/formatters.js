/**
 * Tập hợp hàm format ngày, mã, giới tính, trạng thái và text hiển thị.
 */

import { isValidElement } from 'react'

export const EMPTY_TEXT = 'Chưa có thông tin'

const dateKeys = ['date', '_at', 'birth', 'expires']
const statusLabels = {
  active: 'Đang hoạt động',
  inactive: 'Không hoạt động',
  pending: 'Chờ xử lý',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  draft: 'Bản nháp',
  confirmed: 'Đã xác nhận',
  closed: 'Đã đóng',
  open: 'Đang điều trị',
  paused: 'Tạm dừng',
  active_schedule: 'Đang uống',
  paused_schedule: 'Tạm ngưng',
  cancelled_schedule: 'Đã hủy',
  taken: 'Đã uống',
  'Đã nhắc': 'Đã nhắc',
  'Đã uống': 'Đã uống',
  'Bỏ lỡ': 'Bỏ lỡ',
  late: 'Uống trễ',
  skipped: 'Bỏ qua',
  missed: 'Chưa uống',
  snoozed: 'Nhắc lại sau',
  reviewed: 'Đã xem',
  unread: 'Chưa đọc',
  true: 'Có',
  false: 'Không',
  doctor: 'Bác sĩ',
  admin: 'Quản trị',
  nurse: 'Điều dưỡng',
  receptionist: 'Lễ tân',
  mild: 'Nhẹ',
  moderate: 'Trung bình',
  severe: 'Nặng',
  critical: 'Nguy kịch',
  dang_dieu_tri: 'Đang điều trị',
  dang_kham: 'Đang điều trị',
  da_khoi: 'Đã hoàn thành',
  da_hoan_thanh: 'Đã hoàn thành',
  da_dieu_tri_xong: 'Đã hoàn thành',
  'Đang theo dõi': 'Đang điều trị',
  'Đã kê đơn': 'Đang điều trị',
  'Đã khám': 'Đã hoàn thành',
  'Đang khám': 'Đang điều trị',
  'Đang điều trị': 'Đang điều trị',
  'Đã hoàn thành': 'Đã hoàn thành',
  'Đã điều trị xong': 'Đã hoàn thành',
  'Đang dùng': 'Đang sử dụng',
  'Đang sử dụng': 'Đang sử dụng',
  'Đã xong': 'Đã xong',
  'Hoàn tất': 'Hoàn tất',
  'Đã hủy': 'Đã hủy',
  'Đang uống': 'Đang uống',
  'Tạm ngưng': 'Tạm ngưng',
  'Đã thay thế': 'Đã thay thế',
  Ngừng: 'Ngừng',
  replaced: 'Đã thay thế',
  stopped: 'Ngừng',
  'chưa xem': 'Chưa xem',
  'đã xem': 'Đã xem',
  'vượt ngưỡng': 'Vượt ngưỡng',
  'bình thường': 'Bình thường',
  'còn thuốc': 'Còn thuốc',
  'sắp hết': 'Sắp hết',
  'hết thuốc': 'Hết thuốc',
  'sắp hết hạn': 'Sắp hết hạn',
}

const genderLabels = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
  nam: 'Nam',
  nữ: 'Nữ',
  nu: 'Nữ',
  khác: 'Khác',
  khac: 'Khác',
}

const typeLabels = {
  systolic_bp: 'Huyết áp tâm thu',
  diastolic_bp: 'Huyết áp tâm trương',
  heart_rate: 'Nhịp tim',
  blood_glucose: 'Đường huyết',
  height: 'Chiều cao',
  bmi: 'BMI',
  temperature: 'Nhiệt độ',
  daily: 'Hằng ngày',
  weekly: 'Theo ngày trong tuần',
  interval: 'Cách ngày',
  before_meal: 'Trước ăn',
  after_meal: 'Sau ăn',
  with_meal: 'Trong bữa ăn',
  any: 'Không yêu cầu',
}

export function isEmpty(value) {
  return value === null || value === undefined || value === ''
}

function parseDate(value) {
  if (!value || typeof value !== 'string') return null
  if (/^\d{8}$/.test(value)) {
    const day = Number(value.slice(0, 2))
    const month = Number(value.slice(2, 4))
    const year = Number(value.slice(4, 8))
    const date = new Date(year, month - 1, day)
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : null
  }
  const separated = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (separated) {
    const [, dayText, monthText, yearText] = separated
    const day = Number(dayText)
    const month = Number(monthText)
    const year = Number(yearText)
    const date = new Date(year, month - 1, day)
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : null
  }
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return null
  const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function pad(value) {
  return String(value).padStart(2, '0')
}

/**
 * Hàm tiện ích formatDate dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function formatDate(value) {
  const date = parseDate(value)
  if (!date) return EMPTY_TEXT
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

/**
 * Hàm tiện ích formatDateTime dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function formatDateTime(value) {
  const date = parseDate(value)
  if (!date) return EMPTY_TEXT
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Hàm tiện ích formatTime dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function formatTime(value) {
  if (!value) return EMPTY_TEXT
  const match = String(value).match(/(?:T|\s)?(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : String(value)
}

/**
 * Hàm tiện ích toDateInputValue dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function toDateInputValue(value) {
  const date = parseDate(value)
  if (!date) return value || ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Hàm tiện ích toCompactDateInputValue dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function toCompactDateInputValue(value) {
  const date = parseDate(value)
  if (!date) return value || ''
  return `${pad(date.getDate())}${pad(date.getMonth() + 1)}${date.getFullYear()}`
}

/**
 * Hàm tiện ích toApiDateValue dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function toApiDateValue(value) {
  const date = parseDate(String(value || '').trim())
  if (!date) return null
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Hàm tiện ích toCompactDateTimeInputValue dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function toCompactDateTimeInputValue(value) {
  const date = parseDate(value)
  if (!date) return value || ''
  return `${pad(date.getDate())}${pad(date.getMonth() + 1)}${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Hàm tiện ích toApiDateTimeValue dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function toApiDateTimeValue(value) {
  const trimmed = String(value || '').trim()
  const compact = trimmed.match(/^(\d{8})(?:\s+(\d{1,2}):(\d{2}))?$/)
  if (compact) {
    const [, dateText, hourText = '0', minuteText = '0'] = compact
    const apiDate = toApiDateValue(dateText)
    if (!apiDate) return null
    return `${apiDate} ${pad(hourText)}:${pad(minuteText)}:00`
  }

  const date = parseDate(trimmed)
  if (!date) return null
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

/**
 * Hàm tiện ích toDateTimeInputValue dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function toDateTimeInputValue(value) {
  const date = parseDate(value)
  if (!date) return value || ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Hàm tiện ích formatStatus dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function formatStatus(value) {
  if (isEmpty(value)) return 'Không rõ'
  const text = String(value)
  const key = text.toLowerCase()
  return statusLabels[key] || statusLabels[text] || value
}

/**
 * Hàm tiện ích isMedicalRecordInTreatmentStatus dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function isMedicalRecordInTreatmentStatus(value) {
  return formatStatus(value) === 'Đang điều trị'
}

/**
 * Hàm tiện ích isBeforeToday dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function isBeforeToday(value) {
  const date = parseDate(String(value || '').slice(0, 10))
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date.getTime() < today.getTime()
}

/**
 * Hàm tiện ích statusAfterEndDate dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function statusAfterEndDate(item, activeStatuses = ['Đang sử dụng', 'Đang dùng', 'Đang uống', 'active']) {
  const currentStatus = item?.status || ''
  const normalizedStatus = formatStatus(currentStatus)
  const normalizedActiveStatuses = activeStatuses.map(formatStatus)
  if (isBeforeToday(item?.end_date) && normalizedActiveStatuses.includes(normalizedStatus)) {
    return 'Đã xong'
  }
  return currentStatus
}

/**
 * Hàm tiện ích formatGender dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function formatGender(value) {
  if (isEmpty(value)) return EMPTY_TEXT
  return genderLabels[String(value).toLowerCase()] || value
}

/**
 * Hàm tiện ích formatPatientCode dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function formatPatientCode(patient) {
  if (!patient) return EMPTY_TEXT
  if (patient.patient_code) return patient.patient_code
  const patientId = patient.patient_id || patient.id
  return patientId ? `BN-${String(patientId).padStart(3, '0')}` : EMPTY_TEXT
}

/**
 * Hàm tiện ích formatTypeLabel dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function formatTypeLabel(value) {
  if (isEmpty(value)) return EMPTY_TEXT
  return typeLabels[String(value).toLowerCase()] || value
}

/**
 * Hàm tiện ích statusClassName dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function statusClassName(value) {
  if (isEmpty(value)) return 'default'
  return (
    String(value)
      .toLowerCase()
      .replace(/đ/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'default'
  )
}

/**
 * Hàm tiện ích shouldFormatDate dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function shouldFormatDate(key, value) {
  if (typeof value !== 'string' || !parseDate(value)) return false
  const lowerKey = String(key || '').toLowerCase()
  return dateKeys.some((dateKey) => lowerKey.includes(dateKey))
}

/**
 * Hàm tiện ích formatDisplayValue dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function formatDisplayValue(value, key) {
  if (isValidElement(value)) return value
  if (isEmpty(value)) return EMPTY_TEXT
  const lowerKey = String(key || '').toLowerCase()
  if (lowerKey.includes('time_take') || lowerKey.includes('giờ uống')) {
    return formatTime(value)
  }
  if (typeof value === 'string' && parseDate(value)) {
    const hasTime = value.includes('T') || value.includes(' ')
    return hasTime || lowerKey.includes('_at') ? formatDateTime(value) : formatDate(value)
  }
  if (
    lowerKey.includes('status') ||
    lowerKey.includes('trạng') ||
    lowerKey.includes('vai trò') ||
    lowerKey.includes('tình trạng')
  ) {
    return formatStatus(value)
  }
  if (lowerKey.includes('gender') || lowerKey.includes('giới tính')) {
    return formatGender(value)
  }
  if (
    lowerKey.includes('metric_type') ||
    lowerKey.includes('frequency_type') ||
    lowerKey.includes('meal_timing')
  ) {
    return formatTypeLabel(value)
  }
  if (Array.isArray(value)) return value.length ? value.join(', ') : EMPTY_TEXT
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (value && typeof value === 'object') {
    return value.name || value.full_name || value.patient_code || value.file_name || EMPTY_TEXT
  }
  return value
}
