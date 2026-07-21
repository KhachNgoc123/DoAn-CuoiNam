/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { metricValue } from './medicalRecordHelpers'

/**
 * Hiển thị component MedicalRecordHealthCard trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.bloodPressure Giá trị bloodPressure được dùng để render hoặc xử lý tương tác.
 * @param {*} props.weight Giá trị weight được dùng để render hoặc xử lý tương tác.
 * @param {*} props.spo2 Giá trị spo2 được dùng để render hoặc xử lý tương tác.
 */
export default function MedicalRecordHealthCard({ bloodPressure, weight, spo2 }) {
  return (
    <article className="mc-record-card">
      <h2>Theo dõi sức khỏe</h2>
      <div className="mc-health-mini-grid">
        <div>
          <span>Huyết áp</span>
          <strong>{metricValue(bloodPressure)}</strong>
        </div>
        <div>
          <span>Cân nặng</span>
          <strong>{metricValue(weight)}</strong>
        </div>
        <div>
          <span>SpO2</span>
          <strong>{metricValue(spo2)}</strong>
        </div>
      </div>
      {bloodPressure && <div className="mc-record-warning">Huyết áp cao - vượt ngưỡng theo dõi</div>}
    </article>
  )
}
