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
        title="Quáº£n lÃ½ thuá»‘c"
        subtitle="Quáº£n lÃ½ danh má»¥c thuá»‘c phá»¥c vá»¥ kÃª toa, theo dÃµi háº¡n dÃ¹ng vÃ  tÃ¬nh tráº¡ng sá»­ dá»¥ng."
        actions={
          <>
            <button type="button" className="primary-button" onClick={() => onOpenForm()}>
              <Plus size={17} /> ThÃªm thuá»‘c
            </button>
            <button type="button" className="secondary-button" onClick={onExportExcel}>
              <FileSpreadsheet size={17} /> Xuáº¥t Excel
            </button>
          </>
        }
      />

      <section className="panel medicine-filter-panel">
        <Toolbar
          search={params.search || ''}
          onSearch={onSearch}
          placeholder="TÃ¬m tÃªn thuá»‘c"
          filters={
            <div className="medicine-filter-grid">
              <label className="filter-field">
                <span>NhÃ³m thuá»‘c</span>
                <select value={categoryFilter} onChange={(event) => onCategoryFilterChange(event.target.value)}>
                  <option value="">Táº¥t cáº£ nhÃ³m</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                <span>TÃ¬nh tráº¡ng</span>
                <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
                  <option value="">Táº¥t cáº£</option>
                  <option value="Hoáº¡t Ä‘á»™ng">Hoáº¡t Ä‘á»™ng</option>
                  <option value="Sáº¯p háº¿t">Sáº¯p háº¿t</option>
                  <option value="Háº¿t háº¡n">Háº¿t háº¡n</option>
                </select>
              </label>
            </div>
          }
          actions={
            <button type="button" className="secondary-button" onClick={onResetFilters}>
              XÃ³a lá»c
            </button>
          }
        />
      </section>

      <section className="medicine-stat-grid">
        <article>
          <span>Tá»•ng thuá»‘c</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>NhÃ³m thuá»‘c</span>
          <strong>{stats.categories}</strong>
        </article>
        <article>
          <span>Sáº¯p háº¿t</span>
          <strong>{stats.lowStock}</strong>
        </article>
        <article>
          <span>Háº¿t háº¡n</span>
          <strong>{stats.expired}</strong>
        </article>
      </section>

      {editing !== null && (
        <section className="panel medicine-form-panel">
          <div className="panel-heading">
            <h2>{medicineId(editing) ? 'Cáº­p nháº­t thuá»‘c' : 'ThÃªm thuá»‘c má»›i'}</h2>
          </div>
          <form className="stack-form" onSubmit={onSubmit}>
            <div className="form-grid">
              <Field label="TÃªn thuá»‘c" required>
                <input
                  value={form.medicine_name}
                  onChange={(event) => onFormChange({ medicine_name: event.target.value })}
                  required
                />
              </Field>
              <Field label="NhÃ³m thuá»‘c">
                <select value={form.category_id} onChange={(event) => onFormChange({ category_id: event.target.value })}>
                  <option value="">ChÆ°a chá»n</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="ÄÆ¡n vá»‹">
                <input
                  value={form.unit}
                  placeholder="ViÃªn, á»‘ng, gÃ³i..."
                  onChange={(event) => onFormChange({ unit: event.target.value })}
                />
              </Field>
              <Field label="Tá»“n kho">
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(event) => onFormChange({ quantity: event.target.value })}
                />
              </Field>
              <Field label="Háº¡n dÃ¹ng">
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(event) => onFormChange({ expiry_date: event.target.value })}
                />
              </Field>
              <Field label="MÃ´ táº£" span={2}>
                <textarea value={form.description} onChange={(event) => onFormChange({ description: event.target.value })} />
              </Field>
            </div>
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={onCloseForm}>
                Há»§y
              </button>
              <button className="primary-button" disabled={saving}>
                {saving ? 'Äang lÆ°u...' : 'LÆ°u thuá»‘c'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel medicine-list-panel">
        <div className="panel-heading">
          <h2>Danh sÃ¡ch thuá»‘c</h2>
          <span>{visibleItems.length} thuá»‘c</span>
        </div>
        <DataTable
          columns={columns}
          rows={visibleItems}
          loading={loading}
          onEdit={onOpenForm}
          onDelete={onDelete}
          emptyTitle="ChÆ°a cÃ³ thuá»‘c"
        />
      </section>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="XÃ³a thuá»‘c?"
        description="Chá»‰ xÃ³a Ä‘Æ°á»£c thuá»‘c chÆ°a tá»«ng sá»­ dá»¥ng trong toa thuá»‘c."
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
      <Toast toast={toast} onClose={onCloseToast} />
    </main>
  )
}
