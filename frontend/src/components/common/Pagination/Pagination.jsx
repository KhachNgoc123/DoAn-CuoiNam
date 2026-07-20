
export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.lastPage <= 1) return null

  return (
    <div className="pagination">
      <button type="button" disabled={pagination.currentPage <= 1} onClick={() => onPageChange?.(pagination.currentPage - 1)}>
        Trước
      </button>
      <span>
        Trang {pagination.currentPage} / {pagination.lastPage}
      </span>
      <button
        type="button"
        disabled={pagination.currentPage >= pagination.lastPage}
        onClick={() => onPageChange?.(pagination.currentPage + 1)}
      >
        Sau
      </button>
    </div>
  )
}
