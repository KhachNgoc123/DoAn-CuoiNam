import { Eye, Pill } from 'lucide-react'
import StatusBadge from '../common/StatusBadge/StatusBadge'
import { prescriptionCode, treatmentRange } from '../../utils/healthMetrics'

export default function ActivePrescriptionCard({ prescriptions, loading, error, onViewPrescription }) {
  return (
    <section className="health-active-prescription-card">
      <div className="health-active-prescription-head">
        <div>
          <span className="health-active-prescription-kicker">Đơn thuốc hiện tại</span>
          <h2>Đơn thuốc đang áp dụng</h2>
        </div>
        <Pill size={22} />
      </div>

      {loading ? (
        <p className="health-active-prescription-empty">Đang tải đơn thuốc đang áp dụng...</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : prescriptions.length ? (
        <div className="health-active-prescription-list">
          {prescriptions.map((prescription) => (
            <article className="health-active-prescription-item" key={prescription.prescription_id}>
              <div className="health-active-prescription-meta">
                <div>
                  <span>Mã đơn thuốc</span>
                  <strong>{prescriptionCode(prescription)}</strong>
                </div>
                <div>
                  <span>Chẩn đoán</span>
                  <strong>{prescription.record?.diagnosis || 'Chưa có chẩn đoán'}</strong>
                </div>
                <div>
                  <span>Bác sĩ kê đơn</span>
                  <strong>{prescription.doctor?.full_name || '-'}</strong>
                </div>
                <div>
                  <span>Thời gian điều trị</span>
                  <strong>{treatmentRange(prescription)}</strong>
                </div>
              </div>

              <div className="health-active-medicine-list">
                <span>Thuốc</span>
                {(prescription.details || []).length ? (
                  <ul>
                    {prescription.details.map((detail) => (
                      <li key={detail.prescription_detail_id}>
                        <span>✓</span>
                        <strong>{detail.medicine_name || 'Thuốc trong toa'}</strong>
                        <small>
                          {[detail.dosage, detail.quantity ? `SL: ${detail.quantity}` : '', detail.frequency, detail.meal_time]
                            .filter(Boolean)
                            .join(' • ')}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Đơn thuốc chưa có thuốc.</p>
                )}
              </div>

              <div className="health-active-prescription-actions">
                <StatusBadge value={prescription.status} />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onViewPrescription(prescription)}
                >
                  <Eye size={16} /> Xem chi tiết đơn thuốc
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="health-active-prescription-empty">Bệnh nhân hiện chưa có đơn thuốc đang áp dụng.</p>
      )}
    </section>
  )
}
