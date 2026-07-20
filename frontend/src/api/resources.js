import apiClient, { extractList, extractPagination } from './client'

const cachedListEndpoints = new Set([
  '/frequency-types',
  '/health-types',
  '/meal-times',
  '/medical-record-suggestions',
  '/medical-records',
  '/medicine-schedules',
  '/medicine-categories',
  '/medicines',
  '/patients',
  '/patient-suggestions',
  '/prescriptions',
  '/schedule-days',
  '/health-metrics',
])
const listCache = new Map()
const dashboardCache = new Map()

function currentSessionKey() {
  try {
    const rawUser = localStorage.getItem('doctor_health_user')
    const user = rawUser ? JSON.parse(rawUser) : null
    const token = localStorage.getItem('doctor_health_token') || ''
    return `${user?.doctor_id || 'guest'}:${token.slice(-12)}`
  } catch {
    return 'guest'
  }
}

function cacheKey(endpoint, params) {
  const normalizedParams = Object.keys(params)
    .sort()
    .reduce((values, key) => ({ ...values, [key]: params[key] }), {})
  return `${currentSessionKey()}:${endpoint}:${JSON.stringify(normalizedParams)}`
}

export function clearListCache() {
  listCache.clear()
  dashboardCache.clear()
}

export function hasCachedList(endpoint, params = {}) {
  return cachedListEndpoints.has(endpoint) && listCache.has(cacheKey(endpoint, params))
}

export async function getList(endpoint, params = {}) {
  const key = cacheKey(endpoint, params)
  if (cachedListEndpoints.has(endpoint) && listCache.has(key)) {
    return listCache.get(key)
  }

  const request = apiClient
    .get(endpoint, { params })
    .then((response) => ({
      items: extractList(response),
      pagination: extractPagination(response),
      raw: response.data,
    }))
    .catch((error) => {
      listCache.delete(key)
      throw error
    })

  if (cachedListEndpoints.has(endpoint)) {
    listCache.set(key, request)
  }

  return request
}

export async function getOne(endpoint, id) {
  const response = await apiClient.get(`${endpoint}/${id}`)
  return response.data
}

export async function createOne(endpoint, payload) {
  const response = await apiClient.post(endpoint, payload)
  clearListCache()
  return response.data
}

export async function updateOne(endpoint, id, payload) {
  const response = await apiClient.post(`${endpoint}/${id}`, payload)
  clearListCache()
  return response.data
}

export async function deleteOne(endpoint, id) {
  const response = await apiClient.post(`${endpoint}/${id}/delete`)
  clearListCache()
  return response.data
}

export async function getDashboard(params = {}) {
  const key = cacheKey('/dashboard', params)
  if (dashboardCache.has(key)) {
    return dashboardCache.get(key)
  }

  const request = apiClient
    .get('/dashboard', { params })
    .then((response) => response.data)
    .catch((error) => {
      dashboardCache.delete(key)
      throw error
    })

  dashboardCache.set(key, request)
  return request
}
