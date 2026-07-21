/**
 * File thuộc nhóm pages, điều phối dữ liệu của từng màn hình trước khi truyền xuống component hiển thị.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { forgotPassword, login, resetPassword, verifyResetOtp } from '../../api/authApi'
import { clearListCache } from '../../api/resources'
import AuthActions from '../../components/auth/AuthActions'
import AuthHeader from '../../components/auth/AuthHeader'
import ForgotEmailForm from '../../components/auth/ForgotEmailForm'
import LoginForm from '../../components/auth/LoginForm'
import OtpVerifyForm from '../../components/auth/OtpVerifyForm'
import ResetPasswordForm from '../../components/auth/ResetPasswordForm'
import Toast from '../../components/ui/Toast'

const lastEmail = localStorage.getItem('doctor_health_last_email') || ''

const initialForgotForm = {
  email: lastEmail,
  otp: '',
  password: '',
  password_confirmation: '',
}

/**
 * Điều phối dữ liệu và hiển thị màn hình Login.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.onLogin Giá trị onLogin được dùng để render hoặc xử lý tương tác.
 */
export default function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [form, setForm] = useState({
    email: lastEmail,
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [toast, setToast] = useState(null)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotStep, setForgotStep] = useState('email')
  const [forgotForm, setForgotForm] = useState(initialForgotForm)

  // Hàm updateLoginField gửi dữ liệu chỉnh sửa lên API hoặc component cha.
  function updateLoginField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
  }

  // Hàm updateForgotField gửi dữ liệu chỉnh sửa lên API hoặc component cha.
  function updateForgotField(key, value) {
    setForgotForm((current) => ({ ...current, [key]: value }))
    const errorKeyMap = {
      email: 'forgotEmail',
      otp: 'otp',
      password: 'newPassword',
      password_confirmation: 'passwordConfirmation',
    }
    setFieldErrors((current) => ({ ...current, [errorKeyMap[key]]: '' }))
  }

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

      localStorage.setItem('doctor_health_last_email', response.doctor?.email || form.email)
      onLogin(response.doctor)

      navigate('/', {
        replace: true,
        state: {
          toast: {
            type: 'success',
            message: 'Đăng nhập thành công.',
          },
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

  // Hàm submitForgotPassword gửi dữ liệu mới lên API hoặc component cha.
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
      const response = await resetPassword(forgotForm)
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
        <form className="login-panel auth-card" onSubmit={forgotMode ? submitForgotPassword : submit}>
          <AuthHeader forgotMode={forgotMode} />

          {forgotMode ? (
            <>
              <div className="forgot-step-note">{forgotStepMessage()}</div>
              <ForgotEmailForm
                forgotForm={forgotForm}
                fieldErrors={fieldErrors}
                loading={loading}
                disabled={forgotStep !== 'email'}
                onChange={updateForgotField}
              />
              {forgotStep === 'otp' && (
                <OtpVerifyForm
                  forgotForm={forgotForm}
                  fieldErrors={fieldErrors}
                  loading={loading}
                  disabled={false}
                  onChange={updateForgotField}
                />
              )}
              {forgotStep === 'password' && (
                <ResetPasswordForm
                  forgotForm={forgotForm}
                  fieldErrors={fieldErrors}
                  loading={loading}
                  onChange={updateForgotField}
                />
              )}
            </>
          ) : (
            <LoginForm form={form} fieldErrors={fieldErrors} loading={loading} onChange={updateLoginField} />
          )}

          {error && <div className="form-error">{error}</div>}

          <AuthActions
            loading={loading}
            forgotMode={forgotMode}
            forgotStep={forgotStep}
            submitLabel={forgotSubmitLabel()}
            onResendOtp={resendOtp}
            onToggleForgotMode={toggleForgotMode}
          />
        </form>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
