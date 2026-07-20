import { formatStatus, statusClassName } from '../../../utils/formatters'

export default function StatusBadge({ value }) {
  const displayValue = formatStatus(value)
  return (
    <span className={`status-badge status-${statusClassName(value)}`} data-status={displayValue}>
      {displayValue}
    </span>
  )
}
