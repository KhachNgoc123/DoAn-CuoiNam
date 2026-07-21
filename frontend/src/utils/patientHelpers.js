/**
 * Tiện ích gom dữ liệu bệnh nhân từ nhiều nguồn API khác nhau.
 */

export function normalizeSearch(value)
{
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
/**
 * Hàm tiện ích locationName dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function locationName(location) {
  if (!location) return ''
  return typeof location === 'string' ? location : location.name
}
/**
 * Hàm tiện ích buildAddressValue dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function buildAddressValue(province, ward, detail) {
  return [locationName(province), locationName(ward), detail]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(', ')
}
/**
 * Hàm tiện ích extractWards dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function extractWards(provinceDetail) {
  if (Array.isArray(provinceDetail?.wards)) return provinceDetail.wards
  if (Array.isArray(provinceDetail?.districts)) {
    return provinceDetail.districts.flatMap((district) => district.wards || [])
  }
  return []
}
/**
 * Hàm tiện ích findLocationInAddress dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function findLocationInAddress(locations, address) {
  const addressKey = normalizeSearch(address)
  return locations.find((location) => addressKey.includes(normalizeSearch(location.name)))
}
/**
 * Hàm tiện ích addressDetailWithoutLocations dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function addressDetailWithoutLocations(address, provinceName, wards = []) {
  const locationKeys = new Set(
    [provinceName, ...wards.map((ward) => ward.name)].map(normalizeSearch).filter(Boolean),
  )
  return String(address || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item && !locationKeys.has(normalizeSearch(item)))
    .join(', ')
}
/**
 * Hàm tiện ích currentSuggestionToken dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function currentSuggestionToken(value) {
  return String(value || '').split(/[,;\n]/).pop().trim()
}
/**
 * Hàm tiện ích applyListSuggestion dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function applyListSuggestion(value, suggestion) {
  const text = String(value || '')
  const match = text.match(/^(.*?)([^,;\n]*)$/s)
  return `${match?.[1] || ''}${suggestion}`
}