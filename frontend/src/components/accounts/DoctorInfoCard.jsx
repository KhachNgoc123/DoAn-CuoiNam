/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { KeyRound, Pencil } from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import ProfileItem from './ProfileItem'

/**
 * Hiển thị component DoctorInfoCard trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.profile Giá trị profile được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onEdit Giá trị onEdit được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onChangePassword Giá trị onChangePassword được dùng để render hoặc xử lý tương tác.
 */
export default function DoctorInfoCard({ profile, onEdit, onChangePassword }) {
  return (
    <article className="doctor-info-modern-card">
      <h2>Thông tin cá nhân</h2>
      <div className="doctor-info-modern-grid">
        <ProfileItem label="Mã bác sĩ">
          {profile.doctor_id ? `BS-${String(profile.doctor_id).padStart(3, '0')}` : '-'}
        </ProfileItem>
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
          <button type="button" className="secondary-button" onClick={onEdit}>
            <Pencil size={16} /> Cập nhật thông tin
          </button>
          <button type="button" className="rx-warning-button" onClick={onChangePassword}>
            <KeyRound size={16} /> Đổi mật khẩu
          </button>
        </div>
      </div>
    </article>
  )
}
