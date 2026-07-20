import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  //lây token và gửi lên API
  const token = localStorage.getItem('token')//lưu ý chỗ này
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('doctor_health_token')
      localStorage.removeItem('doctor_health_user')
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  },
)

export function extractList(response) {
  const payload = response.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

export function extractPagination(response) {
  const payload = response.data
  return {
    currentPage: payload?.current_page || 1,
    lastPage: payload?.last_page || 1,
    total: payload?.total || extractList(response).length,
  }
}

export function getErrorMessage(error) {
  const payload = error?.response?.data
  const errors = payload?.errors
  if (errors && typeof errors === 'object') {
    const firstError = Object.values(errors).flat().find(Boolean)
    if (firstError) return firstError
  }
  return payload?.message || 'Có lỗi xảy ra. Vui lòng thử lại.'
}

export default apiClient
