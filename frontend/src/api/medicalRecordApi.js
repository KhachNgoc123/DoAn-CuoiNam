import apiClient from "./client";

// Danh sách hồ sơ bệnh án
export async function getAllMedicalRecords(params = {}) {
    const response = await apiClient.get("/medical-records", {
        params,
    });
    return response.data;
}

// Chi tiết hồ sơ bệnh án
export async function getMedicalRecord(id) {
    const response = await apiClient.get(`/medical-records/${id}`);
    return response.data.data
}
//thêm hồ sơ bệnh án 
export async function createMedicalRecord(data) {

    const response = await apiClient.post(
        "/medical-records",
        data
    );

    return response.data;
}
// Cập nhật hồ sơ bệnh án
export async function updateMedicalRecord(id, data) {

    const response = await apiClient.post(
        `/medical-records/${id}`,
        data
    );

    return response.data;
}