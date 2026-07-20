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
            <th>MÃ£ lá»‹ch</th>
            <th>Bá»‡nh nhÃ¢n</th>
            <th>Thuá»‘c</th>
            <th>Giá» uá»‘ng</th>
            <th>Buá»•i</th>
            <th>Tráº¡ng thÃ¡i</th>
            <th>Nháº¯c thuá»‘c</th>
            <th>Thao tÃ¡c</th>
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
                      <button type="button" className="icon-button" title="Xem chi tiáº¿t" onClick={() => onViewSchedule(id, patient)}>
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title="Cáº­p nháº­t lá»‹ch"
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
                HÃ´m nay chÆ°a cÃ³ lá»‹ch uá»‘ng thuá»‘c
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
          <h1>Lá»‹ch uá»‘ng & nháº¯c thuá»‘c</h1>
          <p>Giám sát lịch dùng thuốc và mức độ tuân thủ</p>
        </div>
        <div className="rx-list-actions">
          <button type="button" className="secondary-button prescription-export-button" onClick={onExportExcel}>
            <FileSpreadsheet size={17} /> Excel
          </button>
          <button type="button" className="primary-button" onClick={onCreateSchedule}>
            <Plus size={18} /> Táº¡o lá»‹ch
          </button>
        </div>
      </section>

      <section className="schedule-filter-card">
        <label>
          <span>TÃ¬m bá»‡nh nhÃ¢n</span>
          <input
            value={params.search || ''}
            onChange={(event) => onSetParams({ search: event.target.value, page: 1, per_page: 20 })}
            placeholder="MÃ£ hoáº·c há» tÃªn"
          />
        </label>
        <label>
          <span>Tráº¡ng thÃ¡i</span>
          <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
            <option value="">Táº¥t cáº£</option>
            <option value="Chá» uá»‘ng">Chá» uá»‘ng</option>
            <option value="ÄÃ£ uá»‘ng">ÄÃ£ uá»‘ng</option>
            <option value="Bá» lá»¡">Bá» lá»¡</option>
          </select>
        </label>
        <label>
          <span>Buá»•i</span>
          <select value={sessionFilter} onChange={(event) => onSessionFilterChange(event.target.value)}>
            <option value="">Táº¥t cáº£</option>
            <option value="SÃ¡ng">SÃ¡ng</option>
            <option value="TrÆ°a">TrÆ°a</option>
            <option value="Chiá»u">Chiá»u</option>
            <option value="Tá»‘i">Tá»‘i</option>
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
          <Search size={17} /> Ãp dá»¥ng
        </button>
      </section>

      <section className="schedule-stat-row">
        <article>
          <span>Tá»•ng lá»‹ch</span>
          <strong>{rows.length}</strong>
        </article>
        <article>
          <span>Äang hoáº¡t Ä‘á»™ng</span>
          <strong>{activeCount}</strong>
        </article>
        <article>
          <span>ÄÃ£ uá»‘ng</span>
          <strong>{takenCount}</strong>
        </article>
        <article>
          <span>Bá» lá»¡</span>
          <strong>{missedCount}</strong>
        </article>
      </section>

      {error ? (
        <EmptyState title="KhÃ´ng truy xuáº¥t Ä‘Æ°á»£c lá»‹ch uá»‘ng thuá»‘c" description={error} />
      ) : (
        <section className="schedule-today-panel">
          <div className="schedule-today-head">
            <div>
              <h2>Hôm nay có lịch nhắc nào?</h2>
              <p>Lịch tiếp theo và trạng thái gửi nhắc</p>
            </div>
          </div>

          {loading ? (
            <p className="schedule-empty-line">Äang táº£i lá»‹ch uá»‘ng thuá»‘c...</p>
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
                  .join(' â€¢ ')
                return (
                  <article className="schedule-reminder-row" key={id}>
                    <div className="schedule-time-pill">
                      <strong>{time}</strong>
                      <span>{sessionFromTime(time)}</span>
                    </div>
                    <div className="schedule-reminder-main">
                      <strong>{formatPatientCode(patient)} â€¢ {patient.full_name || '-'}</strong>
                      <p>
                        {medicines} â€¢ {scheduleMeal(primarySchedule)} â€¢{' '}
                        <StatusBadge value={reminderDisplayStatus(primarySchedule, selectedDate)} />
                      </p>
                    </div>
                    <div className="schedule-row-actions">
                      <button type="button" className="secondary-button" onClick={() => onViewSchedule(id, patient)}>
                        Chi tiáº¿t
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => onEditSchedule(schedulePrescription(primarySchedule), scheduleDetail(primarySchedule))}
                      >
                        <Pencil size={16} /> Cáº­p nháº­t
                      </button>
                      <button type="button" className="rx-warning-button" onClick={() => onCancelSchedule(primarySchedule)}>
                        <CirclePause size={16} /> Táº¡m ngÆ°ng
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={!reminder.allowed || sendingReminder === id}
                        onClick={() => onSendReminder(primarySchedule)}
                      >
                        <Send size={16} /> {sendingReminder === id ? 'Äang gá»­i...' : 'Gá»­i nháº¯c'}
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
            <p className="schedule-empty-line">Äang táº£i danh sÃ¡ch lá»‹ch uá»‘ng thuá»‘c...</p>
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
        title="Táº¡m ngÆ°ng lá»‹ch uá»‘ng thuá»‘c?"
        description="Lá»‹ch sáº½ chuyá»ƒn sang tráº¡ng thÃ¡i Táº¡m ngÆ°ng vÃ  váº«n cÃ²n lÆ°u trong há»‡ thá»‘ng."
        onCancel={onCloseCancel}
        onConfirm={onConfirmCancel}
      />
      <Toast toast={toast} onClose={onCloseToast} />
    </main>
  )
}
