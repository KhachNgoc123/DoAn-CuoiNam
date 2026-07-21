/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

export default function ProfileItem({ label, children }) {
  return (
    <div className="doctor-profile-item">
      <span>{label}</span>
      <strong>{children || '-'}</strong>
    </div>
  )
}
