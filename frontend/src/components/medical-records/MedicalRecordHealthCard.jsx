import { metricValue } from './medicalRecordHelpers'

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
