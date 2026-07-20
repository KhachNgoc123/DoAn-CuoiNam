const ACTIVE_VISIT_KEY = 'doctor_health_active_visit'
const ACTIVE_VISIT_EVENT = 'doctor-health-active-visit-change'

export function getActiveVisit() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_VISIT_KEY) || 'null')
  } catch {
    return null
  }
}

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

export function clearActiveVisit() {
  localStorage.removeItem(ACTIVE_VISIT_KEY)
  window.dispatchEvent(new Event(ACTIVE_VISIT_EVENT))
}

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
