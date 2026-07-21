/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { CirclePause, Eye, FileSpreadsheet, Pencil, Plus, Search, Send } from 'lucide-react'
import ConfirmDialog from '../ui/ConfirmDialog'
import Toast from '../ui/Toast'
import StatusBadge from '../ui/StatusBadge'
import EmptyState from '../ui/EmptyState'
import { formatPatientCode } from '../../utils/formatters'

function TodayScheduleTable({
  rows,
  selectedDate,
  reminderLogs,
  scheduleId,
  scheduleCode,
  schedulePatient,
  scheduleMedicine,
  scheduleDetail,
  schedulePrescription,
  firstScheduleTime,
  sessionFromTime,
  reminderDisplayStatus,
  reminderSendStatus,
  onViewSchedule,
  onEditSchedule,
}) {
  return (
    <div className="table-wrap schedule-today-table-wrap">
      <table className="schedule-today-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã lịch</th>
            <th>Bệnh nhân</th>
            <th>Thuốc</th>
            <th>Giờ uống</th>
            <th>Buổi</th>
            <th>Trạng thái</th>
            <th>Nhắc thuốc</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((schedule, index) => {
              const patient = schedulePatient(schedule)
              const time = firstScheduleTime(schedule)
              const id = scheduleId(schedule)
              return (
                <tr key={`${id}-${time}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{scheduleCode(schedule)}</td>
                  <td>{patient.full_name || '-'}</td>
                  <td>{scheduleMedicine(schedule)}</td>
                  <td>{time}</td>
                  <td>{sessionFromTime(time)}</td>
                  <td>
                    <StatusBadge value={reminderDisplayStatus(schedule, selectedDate)} />
                  </td>
                  <td>
                    <StatusBadge value={reminderSendStatus(schedule, reminderLogs, selectedDate)} />
                  </td>
                  <td>
                    <div className="table-actions schedule-table-actions">
                      <button type="button" className="icon-button" title="Xem chi tiết" onClick={() => onViewSchedule(id, patient)}>
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title="Cập nhật lịch"
                        onClick={() => onEditSchedule(schedulePrescription(schedule), scheduleDetail(schedule))}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td className="schedule-table-empty" colSpan={9}>
                Hôm nay chưa có lịch uống thuốc
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function MedicationSchedulesView({
  params,
  loading,
  error,
  toast,
  selectedDate,
  statusFilter,
  sessionFilter,
  reminderLogs,
  sendingReminder,
  canceling,
  rows,
  groupedTodayRows,
  todayTableRows,
  activeCount,
  missedCount,
  takenCount,
  scheduleId,
  scheduleCode,
  schedulePatient,
  scheduleMedicine,
  scheduleDosage,
  scheduleMeal,
  scheduleDetail,
  schedulePrescription,
  scheduleTimeEntries,
  firstScheduleTime,
  sessionFromTime,
  reminderAvailability,
  reminderDisplayStatus,
  reminderSendStatus,
  onExportExcel,
  onCreateSchedule,
  onSetParams,
  onStatusFilterChange,
  onSessionFilterChange,
  onRefetch,
  onViewSchedule,
  onEditSchedule,
  onCancelSchedule,
  onSendReminder,
  onCloseCancel,
  onConfirmCancel,
  onCloseToast,
}) {
  return (
    <main className="page mc-schedules-page">
      <section className="mc-list-hero">
        <div>
          <h1>Lịch uống & nhắc thuốc</h1>
          <p>Giám sát lịch dùng thuốc và mức độ tuân thủ</p>
        </div>
        <div className="rx-list-actions">
          <button type="button" className="secondary-button prescription-export-button" onClick={onExportExcel}>
            <FileSpreadsheet size={17} /> Excel
          </button>
          <button type="button" className="primary-button" onClick={onCreateSchedule}>
            <Plus size={18} /> Tạo lịch
          </button>
        </div>
      </section>

      <section className="schedule-filter-card">
        <label>
          <span>Tìm bệnh nhân</span>
          <input
            value={params.search || ''}
            onChange={(event) => onSetParams({ search: event.target.value, page: 1, per_page: 20 })}
            placeholder="Mã hoặc họ tên"
          />
        </label>
        <label>
          <span>Trạng thái</span>
          <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
            <option value="">Tất cả</option>
            <option value="Chờ uống">Chờ uống</option>
            <option value="Đã uống">Đã uống</option>
            <option value="Bỏ lỡ">Bỏ lỡ</option>
          </select>
        </label>
        <label>
          <span>Buổi</span>
          <select value={sessionFilter} onChange={(event) => onSessionFilterChange(event.target.value)}>
            <option value="">Tất cả</option>
            <option value="Sáng">Sáng</option>
            <option value="Trưa">Trưa</option>
            <option value="Chiều">Chiều</option>
            <option value="Tối">Tối</option>
          </select>
        </label>
        <label>
          <span>Từ ngày</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => onSetParams({ from_date: event.target.value, to_date: event.target.value, page: 1 })}
          />
        </label>
        <label>
          <span>Đến ngày</span>
          <input
            type="date"
            value={params.to_date || selectedDate}
            onChange={(event) => onSetParams({ to_date: event.target.value, page: 1 })}
          />
        </label>
        <button type="button" className="mc-search-button" onClick={onRefetch}>
          <Search size={17} /> Áp dụng
        </button>
      </section>

      <section className="schedule-stat-row">
        <article>
          <span>Tổng lịch</span>
          <strong>{rows.length}</strong>
        </article>
        <article>
          <span>Đang hoạt động</span>
          <strong>{activeCount}</strong>
        </article>
        <article>
          <span>Đã uống</span>
          <strong>{takenCount}</strong>
        </article>
        <article>
          <span>Bỏ lỡ</span>
          <strong>{missedCount}</strong>
        </article>
      </section>

      {error ? (
        <EmptyState title="Không truy xuất được lịch uống thuốc" description={error} />
      ) : (
        <section className="schedule-today-panel">
          <div className="schedule-today-head">
            <div>
              <h2>Hôm nay có lịch nhắc nào?</h2>
              <p>Lịch tiếp theo và trạng thái gửi nhắc</p>
            </div>
          </div>

          {loading ? (
            <p className="schedule-empty-line">Đang tải lịch uống thuốc...</p>
          ) : groupedTodayRows.length ? (
            <div className="schedule-reminder-list">
              {groupedTodayRows.map((group) => {
                const patient = group.patient
                const primarySchedule = group.schedules[0]
                const time = firstScheduleTime(primarySchedule)
                const reminder = reminderAvailability(primarySchedule, selectedDate)
                const id = scheduleId(primarySchedule)
                const medicines = group.schedules
                  .map((schedule) => {
                    const times = scheduleTimeEntries(schedule).map((entry) => entry.time).join(', ')
                    return `${scheduleMedicine(schedule)} (${scheduleDosage(schedule)} - ${times || firstScheduleTime(schedule)})`
                  })
                  .join(' • ')
                return (
                  <article className="schedule-reminder-row" key={id}>
                    <div className="schedule-time-pill">
                      <strong>{time}</strong>
                      <span>{sessionFromTime(time)}</span>
                    </div>
                    <div className="schedule-reminder-main">
                      <strong>{formatPatientCode(patient)} • {patient.full_name || '-'}</strong>
                      <p>
                        {medicines} • {scheduleMeal(primarySchedule)} •{' '}
                        <StatusBadge value={reminderDisplayStatus(primarySchedule, selectedDate)} />
                      </p>
                    </div>
                    <div className="schedule-row-actions">
                      <button type="button" className="secondary-button" onClick={() => onViewSchedule(id, patient)}>
                        Chi tiết
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => onEditSchedule(schedulePrescription(primarySchedule), scheduleDetail(primarySchedule))}
                      >
                        <Pencil size={16} /> Cập nhật
                      </button>
                      <button type="button" className="rx-warning-button" onClick={() => onCancelSchedule(primarySchedule)}>
                        <CirclePause size={16} /> Tạm ngưng
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={!reminder.allowed || sendingReminder === id}
                        onClick={() => onSendReminder(primarySchedule)}
                      >
                        <Send size={16} /> {sendingReminder === id ? 'Đang gửi...' : 'Gửi nhắc'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>
      )}

      {!error ? (
        <section className="mc-table-panel rx-table-panel schedule-today-table-panel">
          {loading ? (
            <p className="schedule-empty-line">Đang tải danh sách lịch uống thuốc...</p>
          ) : (
            <TodayScheduleTable
              rows={todayTableRows}
              selectedDate={selectedDate}
              reminderLogs={reminderLogs}
              scheduleId={scheduleId}
              scheduleCode={scheduleCode}
              schedulePatient={schedulePatient}
              scheduleMedicine={scheduleMedicine}
              scheduleDetail={scheduleDetail}
              schedulePrescription={schedulePrescription}
              firstScheduleTime={firstScheduleTime}
              sessionFromTime={sessionFromTime}
              reminderDisplayStatus={reminderDisplayStatus}
              reminderSendStatus={reminderSendStatus}
              onViewSchedule={onViewSchedule}
              onEditSchedule={onEditSchedule}
            />
          )}
        </section>
      ) : null}

      <ConfirmDialog
        open={Boolean(canceling)}
        title="Tạm ngưng lịch uống thuốc?"
        description="Lịch sẽ chuyển sang trạng thái Tạm ngưng và vẫn còn lưu trong hệ thống."
        onCancel={onCloseCancel}
        onConfirm={onConfirmCancel}
      />
      <Toast toast={toast} onClose={onCloseToast} />
    </main>
  )
}
