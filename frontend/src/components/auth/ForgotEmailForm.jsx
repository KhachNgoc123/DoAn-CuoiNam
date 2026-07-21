/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

export default function ForgotEmailForm({ forgotForm, fieldErrors, loading, disabled, onChange }) {
  return (
    <>
      <label htmlFor="forgot-email">Email</label>
      <div className={fieldErrors.forgotEmail ? 'field-control-wrap has-error' : 'field-control-wrap'}>
        <input
          id="forgot-email"
          type="email"
          value={forgotForm.email}
          placeholder="Nhập email đã đăng ký"
          autoComplete="email"
          disabled={loading || disabled}
          aria-invalid={Boolean(fieldErrors.forgotEmail)}
          onChange={(event) => onChange('email', event.target.value)}
        />
        {fieldErrors.forgotEmail && <span className="field-error-mark">!</span>}
      </div>
    </>
  )
}
