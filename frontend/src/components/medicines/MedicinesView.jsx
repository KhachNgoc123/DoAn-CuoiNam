/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { FileSpreadsheet, Plus } from 'lucide-react'
import PageHeader from '../ui/PageHeader'
import Toolbar from '../ui/Toolbar'
import DataTable from '../ui/DataTable'
import Field from '../ui/Field'
import ConfirmDialog from '../ui/ConfirmDialog'
import Toast from '../ui/Toast'

export default function MedicinesView({
  params,
  categories,
  categoryFilter,
  statusFilter,
  stats,
  editing,
  form,
  saving,
  deleting,
  toast,
  columns,
  visibleItems,
  loading,
  medicineId,
  onOpenForm,
  onCloseForm,
  onSubmit,
  onFormChange,
  onSearch,
  onCategoryFilterChange,
  onStatusFilterChange,
  onResetFilters,
  onExportExcel,
  onDelete,
  onCancelDelete,
  onConfirmDelete,
  onCloseToast,
}) {
  return (
    <main className="page medicines-page">
      <PageHeader
        title="Quản lý thuốc"
        subtitle="Quản lý danh mục thuốc phục vụ kê toa, theo dõi hạn dùng và tình trạng sử dụng."
        actions={
          <>
            <button type="button" className="primary-button" onClick={() => onOpenForm()}>
              <Plus size={17} /> Thêm thuốc
            </button>
            <button type="button" className="secondary-button" onClick={onExportExcel}>
              <FileSpreadsheet size={17} /> Xuất Excel
            </button>
          </>
        }
      />

      <section className="panel medicine-filter-panel">
        <Toolbar
          search={params.search || ''}
          onSearch={onSearch}
          placeholder="Tìm tên thuốc"
          filters={
            <div className="medicine-filter-grid">
              <label className="filter-field">
                <span>Nhóm thuốc</span>
                <select value={categoryFilter} onChange={(event) => onCategoryFilterChange(event.target.value)}>
                  <option value="">Tất cả nhóm</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                <span>Tình trạng</span>
                <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
                  <option value="">Tất cả</option>
                  <option value="Hoạt động">Hoạt động</option>
                  <option value="Sắp hết">Sắp hết</option>
                  <option value="Hết hạn">Hết hạn</option>
                </select>
              </label>
            </div>
          }
          actions={
            <button type="button" className="secondary-button" onClick={onResetFilters}>
              Xóa lọc
            </button>
          }
        />
      </section>

      <section className="medicine-stat-grid">
        <article>
          <span>Tổng thuốc</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Nhóm thuốc</span>
          <strong>{stats.categories}</strong>
        </article>
        <article>
          <span>Sắp hết</span>
          <strong>{stats.lowStock}</strong>
        </article>
        <article>
          <span>Hết hạn</span>
          <strong>{stats.expired}</strong>
        </article>
      </section>

      {editing !== null && (
        <section className="panel medicine-form-panel">
          <div className="panel-heading">
            <h2>{medicineId(editing) ? 'Cập nhật thuốc' : 'Thêm thuốc mới'}</h2>
          </div>
          <form className="stack-form" onSubmit={onSubmit}>
            <div className="form-grid">
              <Field label="Tên thuốc" required>
                <input
                  value={form.medicine_name}
                  onChange={(event) => onFormChange({ medicine_name: event.target.value })}
                  required
                />
              </Field>
              <Field label="Nhóm thuốc">
                <select value={form.category_id} onChange={(event) => onFormChange({ category_id: event.target.value })}>
                  <option value="">Chưa chọn</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Đơn vị">
                <input
                  value={form.unit}
                  placeholder="Viên, ống, gói..."
                  onChange={(event) => onFormChange({ unit: event.target.value })}
                />
              </Field>
              <Field label="Tồn kho">
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(event) => onFormChange({ quantity: event.target.value })}
                />
              </Field>
              <Field label="Hạn dùng">
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(event) => onFormChange({ expiry_date: event.target.value })}
                />
              </Field>
              <Field label="Mô tả" span={2}>
                <textarea value={form.description} onChange={(event) => onFormChange({ description: event.target.value })} />
              </Field>
            </div>
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={onCloseForm}>
                Hủy
              </button>
              <button className="primary-button" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thuốc'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel medicine-list-panel">
        <div className="panel-heading">
          <h2>Danh sách thuốc</h2>
          <span>{visibleItems.length} thuốc</span>
        </div>
        <DataTable
          columns={columns}
          rows={visibleItems}
          loading={loading}
          onEdit={onOpenForm}
          onDelete={onDelete}
          emptyTitle="Chưa có thuốc"
        />
      </section>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa thuốc?"
        description="Chỉ xóa được thuốc chưa từng sử dụng trong toa thuốc."
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
      <Toast toast={toast} onClose={onCloseToast} />
    </main>
  )
}
