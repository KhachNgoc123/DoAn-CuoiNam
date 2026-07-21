/**
 * Các API liên quan hồ sơ bệnh án.
 */

import apiClient, { extractList, extractPagination } from './client'

export async function getMedicalRecords(params = {}) {
  const response = await apiClient.get('/medical-records', { params })

  return {
    data: extractList(response),
    pagination: extractPagination(response),
    raw: response.data,
  }
}
