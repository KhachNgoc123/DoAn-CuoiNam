import PasswordInput from './PasswordInput'

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
