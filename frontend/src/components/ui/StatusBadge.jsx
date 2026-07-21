/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { formatStatus, statusClassName } from '../../utils/formatters'

/**
 * Hiển thị component StatusBadge trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.value Giá trị value được dùng để render hoặc xử lý tương tác.
 */
export default function StatusBadge({ value }) {
  const displayValue = formatStatus(value)
  return (
    <span className={`status-badge status-${statusClassName(value)}`} data-status={displayValue}>
      {displayValue}
    </span>
  )
}
