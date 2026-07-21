/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { Pencil } from 'lucide-react'

/**
 * Hiển thị phần tiêu đề và nhóm thao tác chính của DoctorProfile.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.onEdit Giá trị onEdit được dùng để render hoặc xử lý tương tác.
 */
export default function DoctorProfileHeader({ onEdit }) {
  return (
    <section className="mc-list-hero">
      <div>
        <h1>Hồ sơ bác sĩ</h1>
      </div>
      <button type="button" className="primary-button" onClick={onEdit}>
        <Pencil size={17} /> Cập nhật hồ sơ
      </button>
    </section>
  )
}
