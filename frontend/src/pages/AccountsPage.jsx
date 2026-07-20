import { useState } from 'react'
import { ImagePlus, KeyRound, Pencil } from 'lucide-react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getErrorMessage } from '../api/client'
import { changePassword, logout, updateMe } from '../api/authApi'//ddooir mk
import AccountForm from '../components/accounts/AccountForm'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Field from '../components/ui/Field'
import Toast from '../components/ui/Toast'
import { formatDate } from '../utils/formatters'

function ProfileItem({ label, children }) {
  return (
    <div className="doctor-profile-item">
      <span>{label}</span>
      <strong>{children || '-'}</strong>
    </div>
  )
}

function doctorInitials(profile) {
  const name = String(profile?.full_name || '').trim()
  if (!name) return 'BS'
  const parts = name.split(/\s+/)
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase()
}

function ChangePasswordForm({ loading, onSubmit, onCancel }) {
const [form, setForm] = useState({ // đõi chỗ này (b4)
  current_password: '',
  new_password: '',
  new_password_confirmation: '',
})
  const [errors, setErrors] = useState({})

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }
//(b5)
  function validate() {
  const nextErrors = {
    current_password: form.current_password
      ? ''
      : 'Vui lòng nhập mật khẩu hiện tại.',

    new_password:
      form.new_password.length < 8
        ? 'Mật khẩu mới phải có ít nhất 8 ký tự.'
        : form.new_password === form.current_password
          ? 'Mật khẩu mới phải khác mật khẩu hiện tại.'
          : '',

    new_password_confirmation:
      form.new_password_confirmation === form.new_password
        ? ''
        : 'Xác nhận mật khẩu mới không khớp.',
  }

  setErrors(nextErrors)

  return (
    !nextErrors.current_password &&
    !nextErrors.new_password &&
    !nextErrors.new_password_confirmation
  )
}
  function submit(event) {
    event.preventDefault()
    if (!validate()) return
    onSubmit(form)
  }
//(b7)
  function passwordField(name, label, autoComplete) {
    return (
      <Field label={label} required>
        <div className={errors[name] ? 'field-control-wrap has-error' : 'field-control-wrap'}>
          <input
            type="password"
            value={form[name]}
            autoComplete={autoComplete}
            aria-invalid={Boolean(errors[name])}
            onChange={(event) => set(name, event.target.value)}
          />
          {errors[name] && (
            <span className="field-error-mark" aria-label={errors[name]}>
              !
            </span>
          )}
        </div>
        {errors[name] && <div className="form-error">{errors[name]}</div>}
      </Field>
    )
  }
//(b6)
  return (
   <form className="stack-form" onSubmit={submit}>
  <div className="form-grid">
    {passwordField('current_password', 'Mật khẩu hiện tại', 'current-password')}
    {passwordField('new_password', 'Mật khẩu mới', 'new-password')}
    {passwordField('new_password_confirmation', 'Xác nhận mật khẩu mới', 'new-password')}
  </div>

      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Hủy
        </button>
        <button className="primary-button" disabled={loading}>
          {loading ? 'Đang đổi...' : 'Đổi mật khẩu'}
        </button>
      </div>
    </form>
  )
}

export default function AccountsPage() {
  const { user, onUserChange } = useOutletContext()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(user || {})
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [toast, setToast] = useState(null)

  async function submitProfile(payload) {
    setSaving(true)
    try {
      const saved = await updateMe(payload)
      setProfile(saved)
      onUserChange(saved)
      localStorage.setItem('doctor_health_user', JSON.stringify(saved))
      setEditing(false)
      setToast({ type: 'success', message: 'Đã cập nhật hồ sơ bác sĩ.' })
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  async function submitPassword(payload) {
    setPasswordSaving(true)
    try {
      const result = await changePassword(payload)
      setChangingPassword(false)
      setToast({ type: 'success', message: result.message || 'Đã đổi mật khẩu thành công.' })
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      // Phiên có thể đã hết hạn; vẫn cần xóa dữ liệu đăng nhập ở máy.
    }
    if (profile?.email) {
      localStorage.setItem('doctor_health_last_email', profile.email)
    }
    localStorage.removeItem('doctor_health_token')
    localStorage.removeItem('doctor_health_user')
    navigate('/login', { replace: true })
  }

  return (
    <main className="mc-doctor-profile-page">
      <section className="mc-list-hero">
        <div>
          <h1>Hồ sơ bác sĩ</h1>
        </div>
        <button type="button" className="primary-button" onClick={() => setEditing(true)}>
          <Pencil size={17} /> Cập nhật hồ sơ
        </button>
      </section>

      <section className="doctor-profile-modern-layout">
        <article className="doctor-avatar-modern-card">
          <div className="doctor-initials-avatar">{doctorInitials(profile)}</div>
          <strong> {profile.full_name || 'Chưa cập nhật họ tên'}</strong>
          <span>{profile.specialty || 'Chưa cập nhật chuyên khoa'}</span>
          <button type="button" className="secondary-button" onClick={() => setEditing(true)}>
            <ImagePlus size={16} /> Thay đổi ảnh đại diện
          </button>
        </article>

        <article className="doctor-info-modern-card">
          <h2>Thông tin cá nhân</h2>
          <div className="doctor-info-modern-grid">
            <ProfileItem label="Mã bác sĩ">{profile.doctor_id ? `BS-${String(profile.doctor_id).padStart(3, '0')}` : '-'}</ProfileItem>
            <ProfileItem label="Họ và tên">{profile.full_name}</ProfileItem>
            <ProfileItem label="Giới tính">{profile.gender || 'Chưa cập nhật'}</ProfileItem>
            <ProfileItem label="Ngày sinh">{formatDate(profile.date_of_birth) || 'Chưa cập nhật'}</ProfileItem>
            <ProfileItem label="Email">{profile.email}</ProfileItem>
            <ProfileItem label="Số điện thoại">{profile.phone}</ProfileItem>
            <ProfileItem label="Địa chỉ">{profile.address || 'Chưa cập nhật'}</ProfileItem>
            <ProfileItem label="Chuyên khoa">{profile.specialty || 'Chưa cập nhật'}</ProfileItem>
          </div>

          <div className="doctor-settings-modern">
            <h2>Cài đặt tài khoản</h2>
            <div className="doctor-settings-actions">
              <button type="button" className="secondary-button" onClick={() => setEditing(true)}>
                <Pencil size={16} /> Cập nhật thông tin
              </button>
              <button type="button" className="rx-warning-button" onClick={() => setChangingPassword(true)}>
                <KeyRound size={16} /> Đổi mật khẩu
              </button>
            </div>
          </div>
        </article>
      </section>

      {editing && (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="dialog wide-dialog doctor-profile-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
          >
            <div className="panel-heading">
              <div>
                <h2 id="edit-profile-title">Chỉnh sửa hồ sơ bác sĩ</h2>
                <p>Chỉ những thay đổi được lưu mới cập nhật vào hồ sơ.</p>
              </div>
            </div>
            <AccountForm
              initialValue={profile}
              loading={saving}
              onSubmit={submitProfile}
              onCancel={() => setEditing(false)}
              onChangePassword={() => {
                setEditing(false)
                setChangingPassword(true)
              }}
            />
          </section>
        </div>
      )}

      {changingPassword && (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="dialog doctor-profile-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
          >
            <div className="panel-heading">
              <div>
                <h2 id="change-password-title">Đổi mật khẩu</h2>
                <p>Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật tài khoản.</p>
              </div>
            </div>
            <ChangePasswordForm
              loading={passwordSaving}
              onSubmit={submitPassword}
              onCancel={() => setChangingPassword(false)}
            />
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmingLogout}
        title="Đăng xuất?"
        description="Bạn có muốn đăng xuất khỏi hệ thống không?"
        confirmLabel="Đăng xuất"
        loadingLabel="Đang đăng xuất..."
        confirmButtonClassName="primary-button"
        loading={loggingOut}
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={handleLogout}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
