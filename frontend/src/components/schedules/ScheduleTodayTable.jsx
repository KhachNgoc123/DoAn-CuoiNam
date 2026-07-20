import { Eye, Pencil } from 'lucide-react'
import StatusBadge from '../common/StatusBadge/StatusBadge'

export default function ScheduleTodayTable({
  rows,
  selectedDate,
  reminderLogs,
  scheduleId,
  scheduleCode,
  schedulePatient,
  scheduleMedicine,
  firstScheduleTime,
  sessionFromTime,
  reminderDisplayStatus,
  reminderSendStatus,
  schedulePrescription,
  scheduleDetail,
  onNavigate,
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
                  <td><StatusBadge value={reminderDisplayStatus(schedule, selectedDate)} /></td>
                  <td><StatusBadge value={reminderSendStatus(schedule, reminderLogs, selectedDate)} /></td>
                  <td>
                    <div className="table-actions schedule-table-actions">
                      <button
                        type="button"
                        className="icon-button"
                        title="Xem chi tiết"
                        onClick={() => onNavigate(`/schedules/${id}`, { state: { patientId: patient.patient_id } })}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title="Cập nhật lịch"
                        onClick={() => onNavigate('/schedules', {
                          state: {
                            mode: 'createFromPrescription',
                            prescriptionId: schedulePrescription(schedule).prescription_id,
                            prescriptionDetailId: scheduleDetail(schedule).prescription_detail_id,
                          },
                        })}
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
              <td className="schedule-table-empty" colSpan={9}>Hôm nay chưa có lịch uống thuốc</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

