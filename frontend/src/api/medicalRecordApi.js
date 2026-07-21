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
    return response.data;
}