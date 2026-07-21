/**
 * Các API thao tác với bệnh nhân: danh sách, chi tiết, thêm, sửa và xóa.
 */

import apiClient from './client'

// Patient API khớp backend/routes/api.php: Laravel đang dùng POST cho update/delete.
export async function getPatients() {
  const response = await apiClient.get('/patients')
  return response.data
}

export async function getPatient(id) {
  const response = await apiClient.get(`/patients/${id}`)
  return response.data
}

export async function createPatient(payload) {
  const response = await apiClient.post('/patients', payload)
  return response.data
}

export async function updatePatient(id, data) {
  const response = await apiClient.post(`/patients/${id}`, data)
  return response.data
}

export async function getPatientSuggestions() {
  const response = await apiClient.get('/patient-suggestions')
  return response.data
}
