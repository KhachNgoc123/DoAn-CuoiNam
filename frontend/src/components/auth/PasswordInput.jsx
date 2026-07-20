import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordInput({ value, onChange, disabled = false, invalid = false }) {
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
