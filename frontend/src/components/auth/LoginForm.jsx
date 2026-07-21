/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import PasswordInput from './PasswordInput'

/**
 * Hiển thị form Login và nhận các hàm xử lý từ component cha.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.form Giá trị form được dùng để render hoặc xử lý tương tác.
 * @param {*} props.fieldErrors Giá trị fieldErrors được dùng để render hoặc xử lý tương tác.
 * @param {*} props.loading Giá trị loading được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onChange Giá trị onChange được dùng để render hoặc xử lý tương tác.
 */
export default function LoginForm({ form, fieldErrors, loading, onChange }) {
  return (
    <>
      <label htmlFor="login-email">Email</label>
      <div className={fieldErrors.email ? 'field-control-wrap has-error' : 'field-control-wrap'}>
        <input
          id="login-email"
          type="email"
          value={form.email}
          placeholder="Nhập email bác sĩ"
          autoComplete="email"
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.email)}
          onChange={(event) => onChange('email', event.target.value)}
        />
        {fieldErrors.email && <span className="field-error-mark">!</span>}
      </div>

      <label htmlFor="login-password">Mật khẩu</label>
      <div className={fieldErrors.password ? 'field-control-wrap has-error' : 'field-control-wrap'}>
        <PasswordInput
          value={form.password}
          disabled={loading}
          invalid={Boolean(fieldErrors.password)}
          onChange={(event) => onChange('password', event.target.value)}
        />
        {fieldErrors.password && <span className="field-error-mark">!</span>}
      </div>
    </>
  )
}
