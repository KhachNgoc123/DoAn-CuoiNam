/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import EmptyState from '../ui/EmptyState'

/**
 * Hiển thị component MedicalRecordAllergyCard trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.allergyRows Giá trị allergyRows được dùng để render hoặc xử lý tương tác.
 */
export default function MedicalRecordAllergyCard({ allergyRows }) {
  return (
    <article className="mc-record-card">
      <h2>Dị ứng thuốc</h2>
      {allergyRows.length ? (
        <div className="mc-record-stack">
          {allergyRows.map((item) => (
            <div className="mc-allergy-box" key={item.id}>
              <strong>{item.medicine_name}</strong>
              <span>{[item.reaction, `Mức độ: ${item.severity}`].filter(Boolean).join(' - ')}</span>
              <small>Nguồn: {item.source || 'Người bệnh cung cấp'}</small>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa ghi nhận dị ứng thuốc" />
      )}
    </article>
  )
}
