/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import EmptyState from '../ui/EmptyState'

/**
 * Hiển thị component MedicalRecordConditionCard trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.chronicRows Giá trị chronicRows được dùng để render hoặc xử lý tương tác.
 */
export default function MedicalRecordConditionCard({ chronicRows }) {
  return (
    <article className="mc-record-card">
      <h2>Bệnh nền / tiền sử</h2>
      {chronicRows.length ? (
        <div className="mc-record-stack">
          {chronicRows.map((item) => (
            <div className="record-info-tile" key={item.id}>
              <span>Tên bệnh</span>
              <strong>{item.disease_name}</strong>
              {(item.duration || item.status) && <small>{[item.duration, item.status].filter(Boolean).join(' - ')}</small>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa ghi nhận bệnh nền" />
      )}
    </article>
  )
}
