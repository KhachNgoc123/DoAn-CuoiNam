/**
 * Tiện ích xác định hồ sơ điều trị đang hoạt động của bệnh nhân.
 */

const ACTIVE_VISIT_KEY = 'doctor_health_active_visit'
const ACTIVE_VISIT_EVENT = 'doctor-health-active-visit-change'

/**
 * Hàm tiện ích getActiveVisit dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function getActiveVisit() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_VISIT_KEY) || 'null')
  } catch {
    return null
  }
}

/**
 * Hàm tiện ích setActiveVisit dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function setActiveVisit(visit) {
  localStorage.setItem(
    ACTIVE_VISIT_KEY,
    JSON.stringify({
      ...visit,
      updatedAt: new Date().toISOString(),
    }),
  )
  window.dispatchEvent(new Event(ACTIVE_VISIT_EVENT))
}

/**
 * Hàm tiện ích clearActiveVisit dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function clearActiveVisit() {
  localStorage.removeItem(ACTIVE_VISIT_KEY)
  window.dispatchEvent(new Event(ACTIVE_VISIT_EVENT))
}

/**
 * Hàm tiện ích subscribeActiveVisit dùng để xử lý dữ liệu trước khi hiển thị, kiểm tra hoặc xuất dữ liệu.
 */
export function subscribeActiveVisit(callback) {
  const handler = () => callback(getActiveVisit())
  window.addEventListener(ACTIVE_VISIT_EVENT, handler)
  window.addEventListener('storage', handler)
  window.addEventListener('focus', handler)
  return () => {
    window.removeEventListener(ACTIVE_VISIT_EVENT, handler)
    window.removeEventListener('storage', handler)
    window.removeEventListener('focus', handler)
  }
}
