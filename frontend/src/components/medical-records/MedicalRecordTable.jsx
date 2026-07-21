/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { Eye, Pencil } from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import StatusBadge from '../ui/StatusBadge'
import { formatRecordCode } from './medicalRecordHelpers'


export default function MedicalRecordTable({ records, loading, onView, onEdit }) {
  return (
    <section className="mc-table-panel medical-record-list-panel">
      <div className="table-wrap medical-record-list-table-wrap">
        <table className="medical-record-list-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã hồ sơ</th>
              <th>Bệnh nhân</th>
              <th>Ngày lập</th>
              <th>Bác sĩ</th>
              <th>Chẩn đoán</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8">Đang tải dữ liệu...</td>
              </tr>
            ) : records.length ? (
              records.map((record, index) => (
                <tr key={record.record_id || record.id}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{formatRecordCode(record)}</strong>
                  </td>
                  <td>
                    <div className="cell-stack">
                      <span>{record.patient?.full_name || '-'}</span>
                      <small>{record.patient?.phone || ''}</small>
                    </div>
                  </td>
                  <td>{formatDate(record.visit_date)}</td>
                  <td>{record.doctor?.full_name || '-'}</td>
                  <td>{record.diagnosis || 'Chưa chẩn đoán'}</td>
                  <td>
                    <StatusBadge value={record.status} />
                  </td>
                  <td>
                    <div className="mc-row-actions">
                      <button
                        type="button"
                        className="icon-button small"
                        title="Xem chi tiết"
                        onClick={() => onView(record)}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button small"
                        title="Cập nhật hồ sơ"
                        onClick={() => onEdit(record)}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">Chưa có hồ sơ bệnh án</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
