export default function ProfileItem({ label, children }) {
  return (
    <div className="doctor-profile-item">
      <span>{label}</span>
      <strong>{children || '-'}</strong>
    </div>
  )
}
