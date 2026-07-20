import apiClient from './client'
export async function login(credentials) {
  const response = await apiClient.post('/auth/login', credentials)

  const data = response.data
//ảnh hưởng từ bên backend chỗ tạo token
  if (data.token) {
    localStorage.setItem(
      'token',
      data.token
    )
  }

  if (data.doctor) {
    localStorage.setItem(
      'doctor_health_user',
      JSON.stringify(data.doctor)
    )
  }

  return data
}
//quen mk
export async function forgotPassword(payload) {
  const response = await apiClient.post('/auth/forgot-password', payload)
  return response.data
}
//dổi mâtk khẩu sau khi xac thuc
export async function resetPassword(payload) {
  const response = await apiClient.post('auth/change-password', payload) // thay chỗ này
  return response.data
}
//Otp
export async function verifyResetOtp(payload) {
  const response = await apiClient.post('auth/verify-reset-otp', payload) // khop vs route
  return response.data
}
//logout
export async function logout() {
localStorage.removeItem('token') //lưu ý chỗ này nữa phải khớp "token" đã tạo tên backend
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
///dổi mk (b8) trong hoof sow 
export async function changePassword(payload) {
  const response = await apiClient.post('/auth/reset-password', payload)
  return response.data
}
