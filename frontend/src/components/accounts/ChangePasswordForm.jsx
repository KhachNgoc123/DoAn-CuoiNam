/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { useState } from 'react'
import Field from '../ui/Field'

/**
 * Hiển thị form ChangePassword và nhận các hàm xử lý từ component cha.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.loading Giá trị loading được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onSubmit Giá trị onSubmit được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onCancel Giá trị onCancel được dùng để render hoặc xử lý tương tác.
 */
export default function ChangePasswordForm({ loading, onSubmit, onCancel }) {
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  })
  const [errors, setErrors] = useState({})

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  function validate() {
    const nextErrors = {
      current_password: form.current_password ? '' : 'Vui lòng nhập mật khẩu hiện tại.',
      new_password:
        form.new_password.length < 8
          ? 'Mật khẩu mới phải có ít nhất 8 ký tự.'
          : form.new_password === form.current_password
            ? 'Mật khẩu mới phải khác mật khẩu hiện tại.'
            : '',
      new_password_confirmation:
        form.new_password_confirmation === form.new_password ? '' : 'Xác nhận mật khẩu mới không khớp.',
    }

    setErrors(nextErrors)

    return !nextErrors.current_password && !nextErrors.new_password && !nextErrors.new_password_confirmation
  }

  function submit(event) {
    event.preventDefault()
    if (!validate()) return
    onSubmit(form)
  }

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
