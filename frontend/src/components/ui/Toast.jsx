import { useEffect } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function Toast({ toast, onClose }) {
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
