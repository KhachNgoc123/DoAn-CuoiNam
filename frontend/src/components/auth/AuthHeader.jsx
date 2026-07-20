export default function AuthHeader({ forgotMode }) {
  return (
    <div className="login-brand-block auth-card-header">
      <span className="auth-mode-pill">{forgotMode ? 'Khôi phục tài khoản' : 'Dành cho bác sĩ'}</span>
      <h1>{forgotMode ? 'Quên mật khẩu' : 'Đăng nhập'}</h1>
      <p>
        {forgotMode
          ? 'Xác thực email để đặt lại mật khẩu tài khoản.'
          : 'Chào mừng bạn quay lại MEDICONTROL.'}
      </p>
    </div>
  )
}
