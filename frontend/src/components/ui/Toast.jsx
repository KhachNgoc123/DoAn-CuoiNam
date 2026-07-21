/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { useEffect } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

/**
 * Hiển thị component Toast trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.toast Giá trị toast được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onClose Giá trị onClose được dùng để render hoặc xử lý tương tác.
 */
export default function Toast({ toast, onClose }) {
  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => {
      onClose?.()
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null
  const Icon = toast.type === 'error' ? XCircle : CheckCircle2

  return (
    <div className={`toast toast-${toast.type || 'success'}`} role="status" aria-live="polite">
      <Icon size={18} />
      <span>{toast.message}</span>
    </div>
  )
}
