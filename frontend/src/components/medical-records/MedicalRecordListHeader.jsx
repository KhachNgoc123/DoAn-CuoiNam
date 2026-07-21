/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { FileSpreadsheet, Plus } from 'lucide-react'

/**
 * Hiển thị phần tiêu đề và nhóm thao tác chính của MedicalRecordList.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.onExport Giá trị onExport được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onCreate Giá trị onCreate được dùng để render hoặc xử lý tương tác.
 */
export default function MedicalRecordListHeader({ onExport, onCreate }) {
  return (
    <section className="mc-list-hero">
      <div>
        <h1>Quản lý hồ sơ bệnh án</h1>
      </div>
      <button type="button" className="secondary-button prescription-export-button" onClick={onExport}>
        <FileSpreadsheet size={17} /> Excel
      </button>
      <button className="primary-button mc-add-button" onClick={onCreate}>
        <Plus size={18} /> Thêm hồ sơ bệnh án
      </button>
    </section>
  )
}
