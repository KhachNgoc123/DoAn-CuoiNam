import { CheckCircle, Pill, Plus, TriangleAlert } from 'lucide-react'
import EmptyState from '../common/EmptyState/EmptyState'
import StatusBadge from '../common/StatusBadge/StatusBadge'
import Toast from '../common/Toast/Toast'
import PatientMedicalRecordsView from '../medical-records/PatientMedicalRecordsView'

export default function PatientDetailView({
  patient,
  currentStatus,
  activeSection,
  setActiveSection,
  detailTabs,
  records,
  prescriptions,
  schedules,
  healthMetrics,
  latestHealthMetrics,
  reminderLogsBySchedule,
  viewingHealthMetric,
  setViewingHealthMetric,
  toast,
  setToast,
  createMedicalRecord,
  prescribe,
  navigate,
  InfoItem,
  Section,
  HealthMetricDialog,
  initials,
  formatPatientCode,
  patientChronicDiseaseText,
  patientAllergyText,
  EMPTY_TEXT,
  formatGender,
  formatDate,
  formatDateTime,
  formatPrescriptionCode,
  getPrescriptionStartDate,
  statusAfterEndDate,
  reminderStatusForSchedule,
  getScheduleSessionsFromTimes,
  evaluateHealthMetric,
  metricTypeName,
  metricValueText,
}) {
  return (
    <main className="page mc-patient-detail-page">
      <section className="mc-detail-hero">
        <div>
          <h1>Chi tiết bệnh nhân</h1>
          <p>{formatPatientCode(patient)} • Cập nhật {formatDate(patient.updated_at || patient.created_at)}</p>
        </div>
        <div className="mc-detail-actions">
          <button className="mc-dark-button" onClick={createMedicalRecord}>
            <Plus size={16} /> Tạo hồ sơ mới
          </button>
          <button className="primary-button" onClick={prescribe}>
            <Pill size={16} /> Kê toa thuốc
          </button>
        </div>
      </section>

      <section className="mc-patient-detail-layout">
        <aside className="mc-patient-profile-card">
          <div className="mc-patient-avatar">{initials(patient.full_name)}</div>
          <h2>{patient.full_name}</h2>
          <StatusBadge value={currentStatus} />
          <div className="mc-patient-side-info">
            <InfoItem label="Mã bệnh nhân" value={formatPatientCode(patient)} />
            <InfoItem label="Số điện thoại" value={patient.phone} />
          </div>
        </aside>

        <div className="mc-patient-detail-main">
          <nav className="patient-detail-nav mc-patient-tabs" aria-label="Thông tin bệnh nhân">
            {detailTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeSection === tab.key ? 'active' : ''}
                onClick={() => setActiveSection(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeSection === 'personal' && (
            <Section title="Thông tin cá nhân">
              <div className="patient-profile-grid">
                <InfoItem label="Họ tên" value={patient.full_name} />
                <InfoItem label="Giới tính" value={formatGender(patient.gender)} />
                <InfoItem label="Ngày sinh" value={formatDate(patient.date_of_birth)} />
                <InfoItem label="Số điện thoại" value={patient.phone} />
                <InfoItem label="Địa chỉ" value={patient.address} />
                <InfoItem label="Trạng thái điều trị" value={currentStatus} />
                <InfoItem label="Bệnh nền" value={patientChronicDiseaseText(patient)} />
                <InfoItem label="Dị ứng thuốc" value={patientAllergyText(patient)} />
              </div>
            </Section>
          )}

          {activeSection === 'prescriptions' && (
            <Section title="Toa thuốc">
              {prescriptions.length ? (
                <div className="patient-detail-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Ngày kê</th>
                        <th>Trạng thái</th>
                        <th>Số thuốc</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map((prescription) => (
                        <tr key={prescription.prescription_id}>
                          <td>{formatPrescriptionCode(prescription)}</td>
                          <td>{formatDate(getPrescriptionStartDate(prescription))}</td>
                          <td><StatusBadge value={statusAfterEndDate(prescription)} /></td>
                          <td>{prescription.details?.length || 0}</td>
                          <td>
                            <button
                              type="button"
                              className="mc-small-text-button"
                              onClick={() =>
                                navigate('/prescriptions', {
                                  state: { viewPrescriptionId: prescription.prescription_id },
                                })
                              }
                            >
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="Chưa có toa thuốc" />
              )}
            </Section>
          )}

          {activeSection === 'schedules' && (
            <Section title="Lịch uống thuốc">
              {schedules.length ? (
                <div className="patient-detail-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Thuốc</th>
                        <th>Buổi uống</th>
                        <th>Tần suất</th>
                        <th>Bữa ăn</th>
                        <th>Thời gian</th>
                        <th>Trạng thái nhắc</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map((schedule) => (
                        <tr key={schedule.schedule_id}>
                          <td>{schedule.detail?.medicine?.medicine_name || EMPTY_TEXT}</td>
                          <td>{getScheduleSessionsFromTimes(schedule.times || []).join(', ') || EMPTY_TEXT}</td>
                          <td>
                            {schedule.detail?.frequency_type?.type_name ||
                              schedule.detail?.frequency_type?.frequency_name ||
                              EMPTY_TEXT}
                          </td>
                          <td>{schedule.detail?.meal_time?.meal_time_name || EMPTY_TEXT}</td>
                          <td>{formatDate(schedule.start_date)} - {formatDate(schedule.end_date)}</td>
                          <td><StatusBadge value={reminderStatusForSchedule(schedule, reminderLogsBySchedule)} /></td>
                          <td>
                            <button
                              type="button"
                              className="mc-small-text-button"
                              onClick={() => navigate(`/schedules/${schedule.schedule_id}`)}
                            >
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="Chưa có lịch uống thuốc" />
              )}
            </Section>
          )}

          {activeSection === 'health' && (
            <Section title="Thông tin sức khỏe">
              <div className="patient-health-alert-card">
                <div className="patient-health-alert-heading">
                  <h3>Cảnh báo sức khỏe</h3>
                </div>
                <div className="patient-health-alert-patient">
                  <span>Bệnh nhân:</span>
                  <strong>{patient.full_name || EMPTY_TEXT}</strong>
                </div>
                {latestHealthMetrics.length ? (
                  <div className="patient-health-alert-list">
                    {latestHealthMetrics.map((metric) => {
                      const evaluation = evaluateHealthMetric(metric)
                      const isWarning = evaluation.status === 'warning'
                      const Icon = isWarning ? TriangleAlert : CheckCircle
                      return (
                        <article
                          className={`patient-health-alert-item ${isWarning ? 'warning' : 'normal'}`}
                          key={metric.health_metric_id || `${metric.health_type_id}-${metric.measure_time}`}
                        >
                          <Icon size={18} />
                          <div>
                            <strong>{metricTypeName(metric)}</strong>
                            <span>{metricValueText(metric)}</span>
                            <small>{isWarning ? `⚠ ${evaluation.message}` : `✓ ${evaluation.message}`}</small>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState title="Chưa có dữ liệu cảnh báo sức khỏe" />
                )}
              </div>

              {healthMetrics.length ? (
                <div className="patient-detail-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Loại chỉ số</th>
                        <th>Giá trị</th>
                        <th>Thời gian đo</th>
                        <th>Ghi chú</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthMetrics.map((metric) => (
                        <tr key={metric.health_metric_id}>
                          <td>{metric.health_type?.health_type_name || EMPTY_TEXT}</td>
                          <td>{metricValueText(metric)}</td>
                          <td>{formatDateTime(metric.measure_time)}</td>
                          <td>{metric.note || EMPTY_TEXT}</td>
                          <td>
                            <button className="mc-small-text-button" onClick={() => setViewingHealthMetric(metric)}>
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </Section>
          )}

          {activeSection === 'records' && (
            <Section title="Hồ sơ bệnh án">
              <PatientMedicalRecordsView
                records={records}
                loading={false}
                onView={(record) => navigate(`/medical-records/${record.record_id}`)}
              />
            </Section>
          )}
        </div>
      </section>

      <HealthMetricDialog metric={viewingHealthMetric} onClose={() => setViewingHealthMetric(null)} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
