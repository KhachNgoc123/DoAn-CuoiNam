/**
 * Các hàm kiểm tra dữ liệu trước khi gửi form bệnh nhân.
 */

import { isValidPhone, normalizePhoneInput } from './phone'
import { toApiDateValue } from './formatters'

export function normalizeFullName(value) {
    return value
        .trim()
        .replace(/\s+/g, ' ')
        .toLocaleLowerCase('vi-VN')
        .split(' ')
        .map(
            (word) =>
                `${word.charAt(0).toLocaleUpperCase('vi-VN')}${word.slice(1)}`,
        )
        .join(' ')
}

/**
 * Hàm tiện ích normalizeGender dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function normalizeGender(value) {
    const key = String(value || '').toLowerCase()

    if (key === 'male' || key === 'nam') return 'Nam'
    if (key === 'female' || key === 'nữ' || key === 'nu') return 'Nữ'

    return ''
}

/**
 * Hàm tiện ích normalizeAddressValue dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function normalizeAddressValue(value) {
    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .join(', ')
}

/**
 * Hàm tiện ích formatBirthDateInput dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function formatBirthDateInput(value) {
    const digits = String(value || '')
        .replace(/\D/g, '')
        .slice(0, 8)

    if (digits.length <= 2) return digits
    if (digits.length <= 4)
        return `${digits.slice(0, 2)}/${digits.slice(2)}`

    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/**
 * Hàm tiện ích isFutureApiDate dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function isFutureApiDate(value) {
    if (!value) return false

    const date = new Date(`${value}T00:00:00`)
    const today = new Date()

    today.setHours(0, 0, 0, 0)

    return date.getTime() > today.getTime()
}

/**
 * Hàm tiện ích validatePatient dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function validatePatient(form) {
    const fullName = normalizeFullName(form.full_name)
    const phone = normalizePhoneInput(form.phone)
    const birthDate = toApiDateValue(form.date_of_birth)
    const address = normalizeAddressValue(form.address)

    const errors = {
        full_name: fullName ? '' : 'Vui lòng nhập họ tên.',
        gender: form.gender ? '' : 'Vui lòng chọn giới tính.',
        date_of_birth: !birthDate
            ? 'Ngày sinh không hợp lệ.'
            : isFutureApiDate(birthDate)
            ? 'Ngày sinh không được lớn hơn hiện tại.'
            : '',
        phone: isValidPhone(phone)
            ? ''
            : 'Số điện thoại chưa đủ 10 chữ số.',
        address: address ? '' : 'Vui lòng nhập địa chỉ.',
    }

    return {
        fullName,
        phone,
        birthDate,
        address,
        errors,
        isValid: !Object.values(errors).some(Boolean),
    }
}

