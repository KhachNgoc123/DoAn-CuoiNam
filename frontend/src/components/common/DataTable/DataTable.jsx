import { Eye, Pencil, Trash2 } from 'lucide-react'
import { formatDisplayValue } from '../../../utils/formatters'
import EmptyState from '../EmptyState/EmptyState'
import LoadingState from '../Loading/Loading'

export default function DataTable({
  columns,
  rows,
  loading,
  onView,
  onEdit,
  onDelete,
  canView = () => true,
  canEdit = () => true,
  canDelete = () => true,
  extraActions,
  emptyTitle,
}) {
  if (loading) return <LoadingState />
  if (!rows.length) return <EmptyState title={emptyTitle} />

  const hasActions = onView || onEdit || onDelete || extraActions
  const getRowKey = (row, rowIndex) =>
    row.id ??
    row.patient_id ??
    row.record_id ??
    row.medical_record_id ??
    row.prescription_id ??
    row.schedule_id ??
    row.health_metric_id ??
    row.feedback_id ??
    row.medicine_id ??
    row.row_id ??
    rowIndex

  return (
    <div className="table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              {hasActions && <th>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={getRowKey(row, rowIndex)}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render
                      ? column.render(row, rowIndex)
                      : formatDisplayValue(row[column.key], column.key)}
                  </td>
                ))}
                {hasActions && (
                  <td>
                    <div className="table-actions">
                      {onView && canView(row) && (
                        <button
                          className="icon-button small"
                          title="Xem chi tiết"
                          aria-label="Xem chi tiết"
                          onClick={() => onView(row)}
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      {onEdit && canEdit(row) && (
                        <button
                          className="icon-button small"
                          title="Sửa"
                          aria-label="Sửa"
                          onClick={() => onEdit(row)}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {onDelete && canDelete(row) && (
                        <button
                          className="icon-button small danger-text"
                          title="Xóa"
                          aria-label="Xóa"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {extraActions?.(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
