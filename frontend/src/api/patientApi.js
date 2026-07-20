import apiClient from './client'
//react Api hiển thị danh sách bệnh nhân
export async function getPatients(){
  const response = await apiClient.get('/patients')
  return response.data
}
//chi tiết bệnh nhân 
export async function getPatient(id){
 const response = await apiClient.get(`/patients/${id}`)
   return response.data.data//sửa chỗ này
}
//thêm bệnh nhân
export async function createPatient(payload){
    const response = await apiClient.post('/patients',payload)
    return response.data

}
//cập nhật bệnh nhân
export async function updatePatient(id,data){
  const response = await apiClient.put(`/patients/${id}`,data)
   return response.data
}
//danh sách bệnh nền và dị ứng 
export async function getPatientSuggestions(){
  const response = await apiClient.get('/patient-suggestions')
  return response.data
}
//hiẻm thị danh sách hồ sơ bệnh án 
export async function getAllMedicalRecords(){
  const response = await apiClient.get('/medical-records')
  return response.data
}


