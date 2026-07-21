/**
 * File thuộc nhóm pages, điều phối dữ liệu của từng màn hình trước khi truyền xuống component hiển thị.
 */

import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { changePassword, logout, updateMe } from '../../api/authApi'
import AccountForm from '../../components/accounts/AccountForm'
import ChangePasswordForm from '../../components/accounts/ChangePasswordForm'
import DoctorAvatarCard from '../../components/accounts/DoctorAvatarCard'
import DoctorInfoCard from '../../components/accounts/DoctorInfoCard'
import DoctorProfileHeader from '../../components/accounts/DoctorProfileHeader'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Toast from '../../components/ui/Toast'

/**
 * ?i?u ph?i d? li?u v? hi?n th? m?n h?nh Accounts.
 */
export default function AccountsPage() {
  const { user, onUserChange } = useOutletContext()
  const navigate = useNavigate()
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [profile, setProfile] = useState(user || {})
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [toast, setToast] = useState(null)

  function openChangePassword() {
    setEditing(false)
    setChangingPassword(true)
  }

  // Hàm submitProfile gửi dữ liệu mới lên API hoặc component cha.
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

  // Hàm submitPassword gửi dữ liệu mới lên API hoặc component cha.
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
      <DoctorProfileHeader onEdit={() => setEditing(true)} />

      <section className="doctor-profile-modern-layout">
        <DoctorAvatarCard profile={profile} onEdit={() => setEditing(true)} />
        <DoctorInfoCard profile={profile} onEdit={() => setEditing(true)} onChangePassword={openChangePassword} />
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
              onChangePassword={openChangePassword}
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
