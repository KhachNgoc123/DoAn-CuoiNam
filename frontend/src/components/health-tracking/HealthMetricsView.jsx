import { AlertTriangle, ArrowLeft, CalendarClock, HeartPulse, Plus, Save, Users } from 'lucide-react'
import PageHeader from '../common/PageHeader/PageHeader'
import Field from '../common/Field/Field'
import LoadingState from '../common/Loading/Loading'
import Toast from '../common/Toast/Toast'
import StatusBadge from '../common/StatusBadge/StatusBadge'
import PatientSearchBox from '../patients/PatientSearchBox'
import ActivePrescriptionCard from './ActivePrescriptionCard'

export default function HealthMetricsView({
  recordingOpen,
  recordingGroup,
  patients,
  form,
  setForm,
  submitMetrics,
  closeRecordForm,
  saving,
  toast,
  setToast,
  location,
  selectedGroup,
  alertGroups,
  openDetail,
  backToList,
  groupWarnings,
  metricTypeName,
  patientLabel,
  patientCode,
  EMPTY_TEXT,
  activePrescriptions,
  activePrescriptionLoading,
  activePrescriptionError,
  viewPrescription,
  currentDoctorName,
  formatDate,
  formatDateTime,
  formatGender,
  backToScheduleDetail,
  openAlerts,
  openRecordForm,
  bloodPressureText,
  currentMetricText,
  bmiText,
  dateHistoryRow,
  groupMetricsByDate,
  filters,
  setFilters,
  groups,
  loading,
  error,
  abnormalCount,
  treatmentCount,
  firstMetricDate,
  groupWarningText,
  todayValue,
}) {
  if (recordingOpen) {
    return (
      <main className="page health-workflow-page">
        <PageHeader title="Ghi nhận chỉ số sức khỏe" />
        <section className="panel health-workflow-card">
          {recordingGroup ? (
            <div className="health-record-patient">
              <span>Bệnh nhân</span>
              <strong>{patientCode(recordingGroup.patient)}</strong>
              <p>{patientLabel(recordingGroup.patient)}</p>
            </div>
          ) : (
            <Field label="Bệnh nhân" required>
              <PatientSearchBox
                patients={patients}
                value={form.patient_id}
                onSelect={(patient) =>
                  setForm((current) => ({ ...current, patient_id: patient ? patient.patient_id : '' }))
                }
                placeholder="Tên, SĐT hoặc mã bệnh nhân"
              />
            </Field>
          )}

          <form className="health-record-form" onSubmit={submitMetrics}>
            <Field label="Ngày ghi nhận" required>
              <input
                type="date"
                value={form.measure_date}
                max={todayValue()}
                onChange={(event) => setForm((current) => ({ ...current, measure_date: event.target.value }))}
                required
              />
            </Field>

            <div className="health-bp-row">
              <Field label="Huyết áp tâm thu" required>
                <input
                  type="number"
                  min="40"
                  max="260"
                  value={form.systolic}
                  placeholder="120"
                  onChange={(event) => setForm((current) => ({ ...current, systolic: event.target.value }))}
                />
              </Field>
              <Field label="Huyết áp tâm trương">
                <input
                  type="number"
                  min="30"
                  max="180"
                  value={form.diastolic}
                  placeholder="80"
                  onChange={(event) => setForm((current) => ({ ...current, diastolic: event.target.value }))}
                />
              </Field>
            </div>

            <div className="health-record-grid">
              <Field label="Nhịp tim">
                <input
                  type="number"
                  min="30"
                  max="220"
                  value={form.heart_rate}
                  placeholder="75"
                  onChange={(event) => setForm((current) => ({ ...current, heart_rate: event.target.value }))}
                />
              </Field>
              <Field label="Nhiệt độ">
                <input
                  type="number"
                  min="30"
                  max="45"
                  step="0.1"
                  value={form.temperature}
                  placeholder="36.8"
                  onChange={(event) => setForm((current) => ({ ...current, temperature: event.target.value }))}
                />
              </Field>
              <Field label="SpO2">
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={form.spo2}
                  placeholder="98"
                  onChange={(event) => setForm((current) => ({ ...current, spo2: event.target.value }))}
                />
              </Field>
              <Field label="Cân nặng">
                <input
                  type="number"
                  min="1"
                  max="300"
                  step="0.1"
                  value={form.weight}
                  placeholder="65"
                  onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))}
                />
              </Field>
              <Field label="Chiều cao">
                <input
                  type="number"
                  min="30"
                  max="250"
                  step="0.1"
                  value={form.height}
                  placeholder="170"
                  onChange={(event) => setForm((current) => ({ ...current, height: event.target.value }))}
                />
              </Field>
            </div>

            <Field label="Ghi chú">
              <textarea
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Ghi chú theo dõi nếu có"
              />
            </Field>

            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={closeRecordForm}>
                Hủy
              </button>
              <button className="primary-button" disabled={saving}>
                <Save size={17} /> {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </section>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </main>
    )
  }

  if (location.state?.healthView === 'alerts') {
    return (
      <main className="mc-health-alert-page">
        <section className="mc-list-hero">
          <div>
            <h1>Cảnh báo sức khỏe</h1>
            <p>Ưu tiên xử lý các chỉ số vượt ngưỡng</p>
          </div>
          <button type="button" className="secondary-button" onClick={selectedGroup ? () => openDetail(selectedGroup) : backToList}>
            <ArrowLeft size={16} /> Theo dõi sức khỏe
          </button>
        </section>

        <section className="health-alert-grid">
          {alertGroups.length ? (
            alertGroups.map((group) => {
              const warnings = groupWarnings(group)
              const warning = warnings[0]
              return (
                <article className="health-alert-card" key={group.id}>
                  <div className="health-alert-card-head">
                    <div>
                      <h2>{patientLabel(group.patient)}</h2>
                      <p>{patientCode(group.patient)} • {group.patient.phone || EMPTY_TEXT}</p>
                    </div>
                    <span className="status-badge info">Cần xử lý</span>
                  </div>

                  <div className="health-alert-info-grid">
                    <div>
                      <span>Loại chỉ số</span>
                      <strong>{warning ? metricTypeName(warning.metric) : 'Chỉ số'}</strong>
                    </div>
                    <div>
                      <span>Giá trị đo</span>
                      <strong>{warning?.value || EMPTY_TEXT}</strong>
                    </div>
                    <div>
                      <span>Nội dung vượt ngưỡng</span>
                      <strong>{warning?.message || 'Cần theo dõi'}</strong>
                    </div>
                  </div>

                  <div className="health-alert-recommendation">
                    <strong>Khuyến nghị</strong>
                    <p>• Theo dõi sát bệnh nhân.</p>
                    <p>• Kiểm tra lại sau 30 phút.</p>
                    <p>• Xem xét điều chỉnh điều trị nếu cảnh báo lặp lại.</p>
                  </div>

                  <button type="button" className="primary-button" onClick={() => openDetail(group)}>
                    Xem hồ sơ theo dõi
                  </button>
                </article>
              )
            })
          ) : (
            <article className="health-alert-empty">
              <HeartPulse size={24} />
              <strong>Không có cảnh báo sức khỏe</strong>
              <p>Các chỉ số hiện tại đang nằm trong ngưỡng theo dõi.</p>
            </article>
          )}
        </section>
      </main>
    )
  }

  if (selectedGroup) {
    const warnings = groupWarnings(selectedGroup)
    const historyByDate = groupMetricsByDate(selectedGroup.metrics).slice(0, 6)

    return (
      <main className="mc-health-detail-page">
        <section className="mc-detail-hero">
          <div>
            <h1>Chi tiết theo dõi sức khỏe</h1>
            <p>{patientCode(selectedGroup.patient)} • {patientLabel(selectedGroup.patient)}</p>
          </div>
          <div className="mc-detail-actions">
            <button type="button" className="secondary-button" onClick={backToList}>
              <ArrowLeft size={16} /> Quay lại
            </button>
            <button type="button" className="secondary-button" onClick={backToScheduleDetail}>
              <CalendarClock size={16} /> Quay lại chi tiết lịch uống thuốc
            </button>
            <button type="button" className="danger-soft-button" onClick={() => openAlerts(selectedGroup)}>
              <AlertTriangle size={16} /> Xem cảnh báo
            </button>
            <button type="button" className="primary-button" onClick={() => openRecordForm(selectedGroup)}>
              <Plus size={17} /> Ghi nhận chỉ số
            </button>
          </div>
        </section>

        <ActivePrescriptionCard
          prescriptions={activePrescriptions}
          loading={activePrescriptionLoading}
          error={activePrescriptionError}
          onViewPrescription={viewPrescription}
        />

        {activePrescriptions.length ? (
          <section className="health-treatment-context-card">
            <HeartPulse size={20} />
            <p>
              {activePrescriptions.length === 1 ? (
                <>
                  Theo dõi các chỉ số sức khỏe của bệnh nhân trong đợt điều trị từ{' '}
                  <strong>{formatDate(activePrescriptions[0].start_date)}</strong> đến{' '}
                  <strong>{formatDate(activePrescriptions[0].end_date)}</strong>.
                </>
              ) : (
                <>
                  Theo dõi các chỉ số sức khỏe của bệnh nhân trong{' '}
                  <strong>{activePrescriptions.length}</strong> đơn thuốc đang áp dụng.
                </>
              )}
            </p>
          </section>
        ) : null}

        <section className="health-detail-card health-patient-card">
          <div className="health-card-title-row">
            <h2>Thông tin bệnh nhân</h2>
            <span>Bác sĩ phụ trách: {currentDoctorName}</span>
          </div>
          <div className="health-detail-info-grid">
            <div><span>Mã bệnh nhân</span><strong>{patientCode(selectedGroup.patient)}</strong></div>
            <div><span>Họ tên</span><strong>{patientLabel(selectedGroup.patient)}</strong></div>
            <div><span>Giới tính / Ngày sinh</span><strong>{formatGender(selectedGroup.patient.gender)} • {formatDate(selectedGroup.patient.date_of_birth)}</strong></div>
          </div>
        </section>

        <section className="health-detail-card">
          <div className="health-card-title-row">
            <h2>Chỉ số hiện tại</h2>
            <span>{formatDateTime(selectedGroup.latestMetric?.measure_time)}</span>
          </div>
          <div className="health-current-tile-grid">
            <article><span>Huyết áp</span><strong>{bloodPressureText(selectedGroup)}</strong><small>mmHg</small></article>
            <article><span>Nhịp tim</span><strong>{currentMetricText(selectedGroup, 'heart_rate').replace(' bpm', '')}</strong><small>bpm</small></article>
            <article><span>Nhiệt độ</span><strong>{currentMetricText(selectedGroup, 'temperature').replace(' °C', '')}</strong><small>°C</small></article>
            <article><span>SpO2</span><strong>{currentMetricText(selectedGroup, 'spo2').replace(' %', '')}</strong><small>%</small></article>
            <article><span>Đường huyết</span><strong>{currentMetricText(selectedGroup, 'blood_sugar')}</strong><small>mmol/L</small></article>
            <article><span>Cân nặng</span><strong>{currentMetricText(selectedGroup, 'weight').replace(' kg', '')}</strong><small>kg</small></article>
            <article><span>Chiều cao</span><strong>{currentMetricText(selectedGroup, 'height').replace(' cm', '')}</strong><small>cm</small></article>
            <article><span>BMI</span><strong>{bmiText(selectedGroup)}</strong></article>
          </div>

          <div className={`health-warning-banner ${warnings.length ? 'warning' : 'normal'}`}>
            {warnings.length ? `⚠ ${warnings[0].message}. Vui lòng kiểm tra lại sau 30 phút.` : '✓ Không có cảnh báo'}
          </div>
        </section>

        <section className="health-detail-card">
          <h2>Lịch sử theo dõi</h2>
          <div className="health-history-table">
            <div className="health-history-head">
              <span>Ngày</span>
              <span>Huyết áp</span>
              <span>Nhịp tim</span>
              <span>Nhiệt độ</span>
              <span>SpO2</span>
              <span>Ghi chú</span>
            </div>
            {historyByDate.length ? (
              historyByDate.map((day) => {
                const row = dateHistoryRow(day.metrics)
                const note = day.metrics.find((metric) => metric.note)?.note || ''
                return (
                  <div className="health-history-row-modern" key={day.date}>
                    <span>{formatDate(day.date)}</span>
                    <span>{row.bloodPressure}</span>
                    <span>{row.heartRate}</span>
                    <span>{row.temperature}</span>
                    <span>{row.spo2}</span>
                    <span>{note || 'Ổn định'}</span>
                  </div>
                )
              })
            ) : (
              <div className="dashboard-empty">Chưa có dữ liệu theo dõi sức khỏe.</div>
            )}
          </div>
        </section>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </main>
    )
  }

  return (
    <main className="mc-health-page">
      <section className="mc-list-hero">
        <div>
          <h1>Theo dõi sức khỏe bệnh nhân</h1>
          <p>Ghi nhận chỉ số và phát hiện bất thường</p>
        </div>
        <button type="button" className="primary-button" onClick={() => openRecordForm(null)}>
          <Plus size={17} /> Ghi nhận chỉ số
        </button>
      </section>

      <section className="health-filter-card">
        <label className="filter-field">
          <span>Tìm bệnh nhân</span>
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Mã hoặc họ tên"
          />
        </label>
        <label className="filter-field">
          <span>Ngày theo dõi</span>
          <input
            type="date"
            value={filters.date}
            onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
          />
        </label>
        <label className="filter-field">
          <span>Trạng thái</span>
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">Tất cả</option>
            <option value="normal">Ổn định</option>
            <option value="abnormal">Có cảnh báo</option>
          </select>
        </label>
        <button type="button" className="primary-button" onClick={() => setFilters((current) => ({ ...current }))}>
          Áp dụng
        </button>
      </section>

      <section className="health-stat-row">
        <article>
          <div><span>Tổng bệnh nhân</span><strong>{groups.length}</strong></div>
          <span className="health-stat-icon blue"><Users size={20} /></span>
        </article>
        <article>
          <div><span>Đang điều trị</span><strong>{treatmentCount}</strong></div>
          <span className="health-stat-icon blue">•</span>
        </article>
        <article>
          <div><span>Có cảnh báo</span><strong>{abnormalCount}</strong></div>
          <span className="health-stat-icon red">!</span>
        </article>
        <article>
          <div><span>Ổn định</span><strong>{Math.max(groups.length - abnormalCount, 0)}</strong></div>
          <span className="health-stat-icon green">✓</span>
        </article>
      </section>

      <section className="health-table-panel">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <p className="form-error">Không truy xuất được dữ liệu theo dõi sức khỏe: {error}</p>
        ) : (
          <div className="health-modern-table">
            <div className="health-modern-table-head">
              <span>STT</span>
              <span>Bệnh nhân</span>
              <span>Lần theo dõi gần nhất</span>
              <span>Huyết áp</span>
              <span>Nhịp tim</span>
              <span>SpO2</span>
              <span>Cảnh báo</span>
              <span>Thao tác</span>
            </div>
            {groups.length ? (
              groups.map((group, index) => (
                <div className="health-modern-table-row" key={group.id}>
                  <span>{index + 1}</span>
                  <strong>
                    {patientLabel(group.patient)}
                    <small>{patientCode(group.patient)}</small>
                  </strong>
                  <span>{formatDateTime(group.latestMetric?.measure_time) || firstMetricDate(group)}</span>
                  <span>{bloodPressureText(group)}</span>
                  <span>{currentMetricText(group, 'heart_rate')}</span>
                  <span>{currentMetricText(group, 'spo2')}</span>
                  <StatusBadge value={group.hasAlert ? groupWarningText(group).replace('⚠ ', '') : 'Ổn định'} />
                  <button
                    type="button"
                    className="secondary-button small-button"
                    onClick={() => openDetail(group)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              ))
            ) : (
              <div className="dashboard-empty">Chưa có dữ liệu phù hợp.</div>
            )}
          </div>
        )}
      </section>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
