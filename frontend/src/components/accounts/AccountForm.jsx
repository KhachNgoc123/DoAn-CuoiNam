import { useState } from 'react'
import AvatarPicker from './AvatarPicker'
import Field from '../ui/Field'
import { toApiDateValue, toDateInputValue } from '../../utils/formatters'

const specialties = ['Nội tổng quát', 'Tim mạch', 'Tiêu hóa', 'Nội tiết', 'Da liễu']

function Section({ title, children }) {
  return (
    <section className="doctor-edit-section">
      <div className="doctor-edit-section-title">{title}</div>
      {children}
    </section>
  )
}

function InfoRow({ label, children }) {
  return (
    <div className="doctor-edit-info-row">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  )
}

export default function AccountForm({ initialValue, loading, onSubmit, onCancel, onChangePassword }) {
  const [form, setForm] = useState({
    full_name: initialValue?.full_name || '',
    email: initialValue?.email || '',
    phone: initialValue?.phone || '',
    specialty: initialValue?.specialty || '',
    avatar: initialValue?.avatar || '',
    gender: initialValue?.gender || 'Nam',
    date_of_birth: toDateInputValue(initialValue?.date_of_birth),
    address: initialValue?.address || '',
  })

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function submit(event) {
    event.preventDefault()
    onSubmit({
      ...form,
      date_of_birth: form.date_of_birth ? toApiDateValue(form.date_of_birth) : '',
    })
  }

  return (
    <form className="doctor-edit-form" onSubmit={submit}>
      <div className="doctor-edit-header-actions">
        <button className="primary-button" disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel}>
          Hủy
        </button>
      </div>

      <div className="doctor-edit-main">
        <aside className="doctor-edit-avatar-panel">
          <div className="doctor-edit-avatar-label">Ảnh đại diện</div>
          <AvatarPicker
            avatar={form.avatar}
            name={form.full_name}
            onChange={(avatar) => set('avatar', avatar)}
          />
        </aside>

        <Section title="Thông tin cá nhân">
          <div className="doctor-edit-grid">
          <InfoRow label="Mã bác sĩ">{initialValue?.doctor_id ? `BS${String(initialValue.doctor_id).padStart(3, '0')}` : '-'}</InfoRow>
            <Field label="Họ và tên" required>
              <input
                value={form.full_name}
                onChange={(event) => set('full_name', event.target.value)}
                required
              />
            </Field>
            <Field label="Giới tính">
              <div className="doctor-edit-radio-group">
                {['Nam', 'Nữ'].map((gender) => (
                  <label key={gender}>
                    <input
                      type="radio"
                      name="gender"
                      checked={form.gender === gender}
                      onChange={() => set('gender', gender)}
                    />
                    {gender}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Ngày sinh">
              <input
                type="date"
                value={form.date_of_birth || ''}
                onChange={(event) => set('date_of_birth', event.target.value)}
              />
            </Field>
            <Field label="Chuyên khoa">
              <select value={form.specialty} onChange={(event) => set('specialty', event.target.value)}>
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Số điện thoại" required>
              <input
                value={form.phone}
                onChange={(event) => set('phone', event.target.value)}
                required
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                value={form.email}
                onChange={(event) => set('email', event.target.value)}
                required
              />
            </Field>
            <Field label="Địa chỉ" span={2}>
              <textarea value={form.address} onChange={(event) => set('address', event.target.value)} />
            </Field>
          </div>
        </Section>
      </div>

      <Section title="Thông tin tài khoản">
        <div className="doctor-edit-account-grid">
          <InfoRow label="Tên đăng nhập">{initialValue?.email || form.email}</InfoRow>
          <InfoRow label="Email đăng nhập">{form.email}</InfoRow>
          <InfoRow label="Mật khẩu">
            ************
            {onChangePassword && (
              <button type="button" className="secondary-button small-button" onClick={onChangePassword}>
                Đổi mật khẩu
              </button>
            )}
          </InfoRow>
        </div>
      </Section>

      <div className="doctor-edit-footer-actions">
        <button className="primary-button" disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel}>
          Hủy
        </button>
      </div>
    </form>
  )
}
