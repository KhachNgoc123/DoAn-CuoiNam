/**
 * Các API đăng nhập, lấy thông tin bác sĩ và luồng quên mật khẩu OTP.
 */

import apiClient from './client'

// Auth API: login/quên mật khẩu/hồ sơ bác sĩ. Token dùng key doctor_health_token.
export async function login(credentials) {
  const response = await apiClient.post('/auth/login', credentials)
  const data = response.data

  if (data.token) {
    localStorage.setItem('doctor_health_token', data.token)
  }

  if (data.doctor) {
    localStorage.setItem('doctor_health_user', JSON.stringify(data.doctor))
  }

  return data
}

export async function forgotPassword(payload) {
  const response = await apiClient.post('/auth/forgot-password', payload)
  return response.data
}

export async function resetPassword(payload) {
  const response = await apiClient.post('auth/change-password', payload)
  return response.data
}

export async function verifyResetOtp(payload) {
  const response = await apiClient.post('auth/verify-reset-otp', payload)
  return response.data
}

export async function logout() {
  localStorage.removeItem('doctor_health_token')
  localStorage.removeItem('doctor_health_user')
}

export async function getMe() {
  const response = await apiClient.get('/auth/me')
  return response.data
}

export async function updateMe(payload) {
  if (payload.avatar instanceof File) {
    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value)
      }
    })
    const response = await apiClient.post('/auth/me', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  const profilePayload = { ...payload }
  delete profilePayload.avatar
  const response = await apiClient.post('/auth/me', profilePayload)
  return response.data
}

export async function changePassword(payload) {
  const response = await apiClient.post('/auth/reset-password', payload)
  return response.data
}
