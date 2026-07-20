import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/client'
import {forgotPassword,login,resetPassword,verifyResetOtp,} from '../api/authApi'
import { clearListCache } from '../api/resources'
import PasswordInput from '../components/auth/PasswordInput'
import Toast from '../components/ui/Toast'

const initialForgotForm = {
  email: localStorage.getItem('doctor_health_last_email') || '',
  otp: '',
  password: '',
  password_confirmation: '',
}

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: localStorage.getItem('doctor_health_last_email') || '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [toast, setToast] = useState(null)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotStep, setForgotStep] = useState('email')
  const [forgotForm, setForgotForm] = useState(initialForgotForm)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setFieldErrors({})

    if (!form.email || !form.password) {
      const nextErrors = {
        email: !form.email ? 'Vui lòng nhập email.' : '',
        password: !form.password ? 'Vui lòng nhập mật khẩu.' : '',
      }
      setFieldErrors(nextErrors)
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }

    setLoading(true)
    try {
      clearListCache()
      const response = await login(form)

localStorage.setItem(
  'doctor_health_last_email',
  response.doctor?.email || form.email
)

onLogin(response.doctor)

navigate('/', {
  replace: true,
  state: { 
    toast: {
      type: 'success',
      message: 'Đăng nhập thành công.'
    }
  },
})
      
    } catch (requestError) {
      const message = getErrorMessage(requestError)
      setError(message)
      setFieldErrors({ email: message, password: message })
      setToast(null)
    } finally {
      setLoading(false)
    }
  }

  async function submitForgotPassword(event) {
    event.preventDefault()
    setError('')
    setFieldErrors({})

    if (forgotStep === 'email') {
      if (!forgotForm.email) {
        setError('Vui lòng nhập email đã đăng ký.')
        setFieldErrors({ forgotEmail: 'Vui lòng nhập email đã đăng ký.' })
        return
      }

      setLoading(true)
      try {
        const response = await forgotPassword({ email: forgotForm.email })
        setForgotStep('otp')
        setToast({ type: 'success', message: response.message || 'Mã OTP đã được gửi về email.' })
      } catch (requestError) {
        setError(getErrorMessage(requestError))
        setToast(null)
      } finally {
        setLoading(false)
      }
      return
    }

    if (forgotStep === 'otp') {
      if (!forgotForm.otp) {
        setError('Vui lòng nhập mã OTP.')
        setFieldErrors({ otp: 'Vui lòng nhập mã OTP.' })
        return
      }

      setLoading(true)
      try {
        const response = await verifyResetOtp({ email: forgotForm.email, otp: forgotForm.otp })
        setForgotStep('password')
        setToast({ type: 'success', message: response.message || 'Xác thực OTP thành công.' })
      } catch (requestError) {
        setError(getErrorMessage(requestError))
        setToast(null)
      } finally {
        setLoading(false)
      }
      return
    }

    if (!forgotForm.password || !forgotForm.password_confirmation) {
      setError('Vui lòng nhập mật khẩu mới và xác nhận mật khẩu.')
      setFieldErrors({
        newPassword: !forgotForm.password ? 'Vui lòng nhập mật khẩu mới.' : '',
        passwordConfirmation: !forgotForm.password_confirmation ? 'Vui lòng nhập xác nhận mật khẩu.' : '',
      })
      return
    }

    if (forgotForm.password !== forgotForm.password_confirmation) {
      setError('Mật khẩu nhập lại không trùng khớp.')
      setFieldErrors({ passwordConfirmation: 'Mật khẩu nhập lại không trùng khớp.' })
      return
    }

    setLoading(true)
    try {
      const response = await resetPassword(forgotForm) //khuc nay sua
      setToast({ type: 'success', message: response.message || 'Đổi mật khẩu thành công.' })
      setForm({ email: forgotForm.email, password: '' })
      setForgotMode(false)
      setForgotStep('email')
      setForgotForm({ ...initialForgotForm, email: forgotForm.email })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      setToast(null)
    } finally {
      setLoading(false)
    }
  }

  async function resendOtp() {
    setError('')
    setFieldErrors({})
    setLoading(true)
    try {
      const response = await forgotPassword({ email: forgotForm.email })
      setForgotStep('otp')
      setForgotForm((current) => ({ ...current, otp: '', password: '', password_confirmation: '' }))
      setToast({ type: 'success', message: response.message || 'Mã OTP mới đã được gửi về email.' })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      setToast(null)
    } finally {
      setLoading(false)
    }
  }

  function toggleForgotMode() {
    setError('')
    setFieldErrors({})
    setToast(null)
    setForgotMode((current) => !current)
    setForgotStep('email')
    setForgotForm((current) => ({
      ...initialForgotForm,
      email: current.email || form.email,
    }))
  }

  function forgotStepMessage() {
    if (forgotStep === 'email') return 'Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu.'
    if (forgotStep === 'otp') return 'Nhập mã OTP trong email để xác thực tài khoản.'
    return 'OTP đã xác thực. Nhập mật khẩu mới để hoàn tất.'
  }

  function forgotSubmitLabel() {
    if (!forgotMode) return 'Đăng nhập'
    if (forgotStep === 'email') return 'Gửi mã OTP'
    if (forgotStep === 'otp') return 'Xác thực OTP'
    return 'Đổi mật khẩu'
  }

  return (
    <main className="login-shell auth-page">
      <div className="auth-layout">
        <section className="auth-hero-panel" aria-label="Giới thiệu MEDICONTROL">
          <div className="auth-logo-row">
            <span className="auth-logo-mark">+</span>
            <strong>MEDICONTROL</strong>
          </div>
          <div className="auth-hero-copy">
            <span className="auth-eyebrow">Hệ thống dành cho bác sĩ</span>
            <h1>Quản lý điều trị và nhắc uống thuốc gọn trong một nơi.</h1>
            <p>Theo dõi bệnh nhân, hồ sơ bệnh án, toa thuốc và lịch uống thuốc với dữ liệu đồng bộ từ hệ thống.</p>
          </div>
          <div className="auth-feature-list">
            <span>Hồ sơ bệnh án</span>
            <span>Đơn thuốc</span>
            <span>Lịch nhắc uống thuốc</span>
          </div>
        </section>

        <form className="login-panel auth-card" onSubmit={forgotMode ? submitForgotPassword : submit}>
          <div className="login-brand-block auth-card-header">
            <span className="auth-mode-pill">{forgotMode ? 'Khôi phục tài khoản' : 'Dành cho bác sĩ'}</span>
            <h1>{forgotMode ? 'Quên mật khẩu' : 'Đăng nhập'}</h1>
            <p>
              {forgotMode
                ? 'Xác thực email để đặt lại mật khẩu tài khoản.'
                : 'Chào mừng bạn quay lại MEDICONTROL.'}
            </p>
          </div>

          {forgotMode ? (
            <>
              <div className="forgot-step-note">{forgotStepMessage()}</div>

              <label htmlFor="forgot-email">Email</label>
              <div className={fieldErrors.forgotEmail ? 'field-control-wrap has-error' : 'field-control-wrap'}>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotForm.email}
                  placeholder="Nhập email đã đăng ký"
                  autoComplete="email"
                  disabled={loading || forgotStep !== 'email'}
                  aria-invalid={Boolean(fieldErrors.forgotEmail)}
                  onChange={(event) => {
                    setForgotForm({ ...forgotForm, email: event.target.value })
                    setFieldErrors((current) => ({ ...current, forgotEmail: '' }))
                  }}
                />
                {fieldErrors.forgotEmail && <span className="field-error-mark">!</span>}
              </div>

              {(forgotStep === 'otp' || forgotStep === 'password') && (
                <>
                  <label htmlFor="forgot-otp">Mã OTP</label>
                  <div className={fieldErrors.otp ? 'field-control-wrap has-error' : 'field-control-wrap'}>
                    <input
                      id="forgot-otp"
                      value={forgotForm.otp}
                      placeholder="Nhập 6 số OTP"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
                      disabled={loading || forgotStep === 'password'}
                      aria-invalid={Boolean(fieldErrors.otp)}
                      onChange={(event) => {
                        setForgotForm({
                          ...forgotForm,
                          otp: event.target.value.replace(/\D/g, '').slice(0, 6),
                        })
                        setFieldErrors((current) => ({ ...current, otp: '' }))
                      }}
                    />
                    {fieldErrors.otp && <span className="field-error-mark">!</span>}
                  </div>
                </>
              )}

              {forgotStep === 'password' && (
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
                      onChange={(event) => {
                        setForgotForm({ ...forgotForm, password: event.target.value })
                        setFieldErrors((current) => ({ ...current, newPassword: '' }))
                      }}
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
                      onChange={(event) => {
                        setForgotForm({ ...forgotForm, password_confirmation: event.target.value })
                        setFieldErrors((current) => ({ ...current, passwordConfirmation: '' }))
                      }}
                    />
                    {fieldErrors.passwordConfirmation && <span className="field-error-mark">!</span>}
                  </div>
                </>
              )}
            </>
          ) : (
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
                  onChange={(event) => {
                    setForm({ ...form, email: event.target.value })
                    setFieldErrors((current) => ({ ...current, email: '' }))
                  }}
                />
                {fieldErrors.email && <span className="field-error-mark">!</span>}
              </div>
              <label htmlFor="login-password">Mật khẩu</label>
              <div className={fieldErrors.password ? 'field-control-wrap has-error' : 'field-control-wrap'}>
                <PasswordInput
                  value={form.password}
                  disabled={loading}
                  invalid={Boolean(fieldErrors.password)}
                  onChange={(event) => {
                    setForm({ ...form, password: event.target.value })
                    setFieldErrors((current) => ({ ...current, password: '' }))
                  }}
                />
                {fieldErrors.password && <span className="field-error-mark">!</span>}
              </div>
            </>
          )}

          {error && <div className="form-error">{error}</div>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? (forgotMode ? 'Đang xử lý...' : 'Đang đăng nhập...') : forgotSubmitLabel()}
          </button>

          {forgotMode && (forgotStep === 'otp' || forgotStep === 'password') && (
            <button type="button" className="secondary-button" disabled={loading} onClick={resendOtp}>
              Gửi lại OTP
            </button>
          )}

          <button type="button" className="secondary-button auth-link-button" disabled={loading} onClick={toggleForgotMode}>
            {forgotMode ? 'Quay lại đăng nhập' : 'Quên mật khẩu'}
          </button>
        </form>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
