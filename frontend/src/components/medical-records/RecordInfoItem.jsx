/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { displayText } from './medicalRecordHelpers'

/**
 * Hiển thị component RecordInfoItem trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.label Giá trị label được dùng để render hoặc xử lý tương tác.
 * @param {*} props.value Giá trị value được dùng để render hoặc xử lý tương tác.
 * @param {*} props.className Giá trị className được dùng để render hoặc xử lý tương tác.
 */
export default function RecordInfoItem({ label, value, className = '' }) {
  return (
    <div className={`record-info-tile ${className}`}>
      <span>{label}</span>
      <strong>{displayText(value)}</strong>
    </div>
  )
}
