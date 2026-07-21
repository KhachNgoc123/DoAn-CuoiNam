/**
 * Các API thao tác với bệnh nhân.
 */

import apiClient from './client'

// Danh sách bệnh nhân
export async function getPatients() {
  const response = await apiClient.get('/patients')
  return response.data
}

// Chi tiết bệnh nhân
export async function getPatient(id) {
  const response = await apiClient.get(`/patients/${id}`)
  return response.data
}

// Thêm bệnh nhân
export async function createPatient(payload) {
  const response = await apiClient.post('/patients', payload)
  return response.data
}

// Cập nhật bệnh nhân
export async function updatePatient(id, data) {
  const response = await apiClient.post(`/patients/${id}`, data)
  return response.data
}

// Danh sách bệnh nền và dị ứng
export async function getPatientSuggestions() {
  const response = await apiClient.get('/patient-suggestions')
  return response.data
}

// Danh sách hồ sơ bệnh án
export async function getAllMedicalRecords() {
  const response = await apiClient.get('/medical-records')
  return response.data
}