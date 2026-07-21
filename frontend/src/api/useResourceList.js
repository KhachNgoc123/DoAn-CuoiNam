/**
 * Hook nạp danh sách có loading, lỗi, filter và phân trang.
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from './client'
import { getList, hasCachedList } from './resources'

export default function useResourceList(endpoint, initialParams = {}) {
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 })
  const [params, setParams] = useState({ page: 1, per_page: 10, ...initialParams })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestError, setRequestError] = useState(null)
  const requestIdRef = useRef(0)

  // Hàm fetchData nạp dữ liệu từ API hoặc nguồn dữ liệu hiện có để cập nhật giao diện.
  const fetchData = useCallback(
    async (nextParams = params) => {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      setLoading(!hasCachedList(endpoint, nextParams))
      setError('')
      setRequestError(null)
      try {
        const result = await getList(endpoint, nextParams)
        if (requestId !== requestIdRef.current) return
        setItems(result.items)
        setPagination(result.pagination)
      } catch (requestError) {
        if (requestId !== requestIdRef.current) return
        setError(getErrorMessage(requestError))
        setRequestError(requestError)
        setItems([])
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    },
    [endpoint, params],
  )

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    fetchData(params)
  }, [fetchData, params])

  // Hàm updateParams gửi dữ liệu chỉnh sửa lên API hoặc component cha.
  function updateParams(next) {
    setParams((current) => {
      const merged = { ...current, ...next }
      return Object.keys(merged).every((key) => merged[key] === current[key]) ? current : merged
    })
  }

  return {
    items,
    pagination,
    params,
    loading,
    error,
    requestError,
    setItems,
    setParams: updateParams,
    refetch: () => fetchData(params),
  }
}
