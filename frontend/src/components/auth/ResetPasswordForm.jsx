/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

export default function ResetPasswordForm({ forgotForm, fieldErrors, loading, onChange }) {
  return (
    <>
      <label htmlFor="forgot-new-password">Mật khẩu mới</label>
      <div className={fieldErrors.newPassword ? 'field-control-wrap has-error' : 'field-control-wrap'}>
        <input
          id="forgot-new-password"
          type="password"
          value={forgotForm.password}
          placeholder="Nhập mật khẩu mới"
          autoComplete="new-password"
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.newPassword)}
          onChange={(event) => onChange('password', event.target.value)}
        />
        {fieldErrors.newPassword && <span className="field-error-mark">!</span>}
      </div>

      <label htmlFor="forgot-password-confirmation">Nhập lại mật khẩu mới</label>
      <div className={fieldErrors.passwordConfirmation ? 'field-control-wrap has-error' : 'field-control-wrap'}>
        <input
          id="forgot-password-confirmation"
          type="password"
          value={forgotForm.password_confirmation}
          placeholder="Nhập lại mật khẩu mới"
          autoComplete="new-password"
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
          onChange={(event) => onChange('password_confirmation', event.target.value)}
        />
        {fieldErrors.passwordConfirmation && <span className="field-error-mark">!</span>}
      </div>
    </>
  )
}
