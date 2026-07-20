/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../services/api'
import { getList, hasCachedList } from '../services/resourceService'

export default function useResourceList(endpoint, initialParams = {}) {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 })
  const [params, setParams] = useState({ page: 1, per_page: 10, ...initialParams })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestError, setRequestError] = useState(null)
  const requestIdRef = useRef(0)

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

  useEffect(() => {
    fetchData(params)
  }, [fetchData, params])

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
