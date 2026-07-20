import apiClient from './client'
//react Api hiển thị danh sách bệnh nhân
export async function getPatients(){
  const response = await apiClient.get('/patients')
  return response.data
}
export async function createPatient(payload){
    const response = await apiClient.get('/patients',payload)
    return response.data

}


