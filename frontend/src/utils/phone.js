/**
 * Tiện ích chuẩn hóa và kiểm tra số điện thoại.
 */

export const PHONE_DIGIT_COUNT = 10

/**
 * Hàm tiện ích normalizePhoneInput dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function normalizePhoneInput(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, PHONE_DIGIT_COUNT)
}

/**
 * Hàm tiện ích isValidPhone dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function isValidPhone(value) {
  return new RegExp(`^\\d{${PHONE_DIGIT_COUNT}}$`).test(value)
}
