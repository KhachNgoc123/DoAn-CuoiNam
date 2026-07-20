export default function AuthActions({
  loading,
  forgotMode,
  forgotStep,
  submitLabel,
  onResendOtp,
  onToggleForgotMode,
}) {
  return (
    <>
      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? (forgotMode ? 'Đang xử lý...' : 'Đang đăng nhập...') : submitLabel}
      </button>

      {forgotMode && forgotStep === 'otp' && (
        <button type="button" className="secondary-button" disabled={loading} onClick={onResendOtp}>
          Gửi lại OTP
        </button>
      )}

      <button type="button" className="secondary-button auth-link-button" disabled={loading} onClick={onToggleForgotMode}>
        {forgotMode ? 'Quay lại đăng nhập' : 'Quên mật khẩu'}
      </button>
    </>
  )
}
