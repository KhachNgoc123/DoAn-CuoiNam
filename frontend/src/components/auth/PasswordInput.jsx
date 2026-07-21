/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Hiển thị component PasswordInput trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.value Giá trị value được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onChange Giá trị onChange được dùng để render hoặc xử lý tương tác.
 * @param {*} props.disabled Giá trị disabled được dùng để render hoặc xử lý tương tác.
 * @param {*} props.invalid Giá trị invalid được dùng để render hoặc xử lý tương tác.
 */
export default function PasswordInput({ value, onChange, disabled = false, invalid = false }) {
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-input">
      <input
        id="login-password"
        type={visible ? 'text' : 'password'}
        value={value}
        disabled={disabled}
        aria-invalid={invalid}
        autoComplete="current-password"
        onChange={onChange}
      />
      <button
        type="button"
        className="password-input-toggle"
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-pressed={visible}
        title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}
