import apiClient from './client'
//react Api hiển thị danh sách bệnh nhân
export async function getPatients(){
  const response = await apiClient.get('/patients')
  return response.data
}
//thêm bệnh nhân
export async function createPatient(payload){
    const response = await apiClient.get('/patients',payload)
    return response.data

}
//cập nhật bệnh nhân
export async function updatePatient(id,data){
  const response = await apiClient.put(`/patient/${id}`,data)
}




