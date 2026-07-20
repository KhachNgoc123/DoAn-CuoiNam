export const PHONE_DIGIT_COUNT = 10

export function normalizePhoneInput(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, PHONE_DIGIT_COUNT)
}

export function isValidPhone(value) {
  return new RegExp(`^\\d{${PHONE_DIGIT_COUNT}}$`).test(value)
}
