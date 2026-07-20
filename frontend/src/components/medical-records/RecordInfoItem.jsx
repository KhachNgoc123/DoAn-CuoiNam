import { displayText } from './medicalRecordHelpers'

export default function RecordInfoItem({ label, value, className = '' }) {
  return (
    <div className={`record-info-tile ${className}`}>
      <span>{label}</span>
      <strong>{displayText(value)}</strong>
    </div>
  )
}
