import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Plus } from 'lucide-react'
import useResourceList from '../../hooks/useResourceList'
import { createOne, deleteOne, getList, updateOne } from '../../services/resourceService'
import { getErrorMessage } from '../../services/api'
import PageHeader from '../../components/common/PageHeader/PageHeader'
import Toolbar from '../../components/common/Toolbar/Toolbar'
import DataTable from '../../components/common/DataTable/DataTable'
import Field from '../../components/common/Field/Field'
import ConfirmDialog from '../../components/common/Modal/ConfirmDialog'
import Toast from '../../components/common/Toast/Toast'
import StatusBadge from '../../components/common/StatusBadge/StatusBadge'
import { formatDate } from '../../utils/formatters'
import { downloadStyledExcel } from '../../utils/excelExport'

const emptyForm = {
  category_id: '',
  medicine_name: '',
  unit: '',
  quantity: '',
  expiry_date: '',
  description: '',
}

function toInputDate(value) {
  return value ? String(value).slice(0, 10) : ''
}

function medicineCode(medicine) {
  return `TH${String(medicine.medicine_id || medicine.id || '').padStart(3, '0')}`
}

function medicineId(medicine) {
  return medicine?.medicine_id ?? medicine?.id
}

function isExpired(medicine) {
  return Boolean(
    medicine.expiry_date && toInputDate(medicine.expiry_date) < new Date().toISOString().slice(0, 10),
  )
}

function isLowStock(medicine) {
  const quantity = Number(medicine.quantity || 0)
  return quantity > 0 && quantity <= 10
}

function medicineStatus(medicine) {
  if (isExpired(medicine)) return 'Hết hạn'
  if (isLowStock(medicine)) return 'Sắp hết'
  return 'Hoạt động'
}

export default function MedicinesPage() {
  const { items, params, setParams, loading, refetch } = useResourceList('/medicines', { per_page: 20 })
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    getList('/medicine-categories', { per_page: 50 })
      .then((result) => setCategories(result.items))
      .catch(() => setCategories([]))
  }, [])

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter && String(item.category_id || item.category?.category_id) !== String(categoryFilter)) {
        return false
      }
      if (statusFilter && medicineStatus(item) !== statusFilter) return false
      return true
    })
  }, [categoryFilter, items, statusFilter])

  const stats = useMemo(
    () => ({
      total: items.length,
      categories: new Set(items.map((item) => item.category_id || item.category?.category_id).filter(Boolean)).size,
      lowStock: items.filter(isLowStock).length,
      expired: items.filter(isExpired).length,
    }),
    [items],
  )

  const columns = [
    { key: 'medicine_id', label: 'Mã thuốc', render: medicineCode },
    { key: 'medicine_name', label: 'Tên thuốc' },
    { key: 'category', label: 'Nhóm thuốc', render: (row) => row.category?.category_name || '-' },
    { key: 'unit', label: 'Đơn vị' },
    { key: 'quantity', label: 'Tồn kho', render: (row) => row.quantity ?? '-' },
    { key: 'expiry_date', label: 'Hạn dùng', render: (row) => formatDate(row.expiry_date) || '-' },
    { key: 'status', label: 'Tình trạng', render: (row) => <StatusBadge value={medicineStatus(row)} /> },
  ]

  function openForm(medicine = null) {
    setEditing(medicine || {})
    setForm(
      medicine
        ? {
            category_id: medicine.category_id || '',
            medicine_name: medicine.medicine_name || '',
            unit: medicine.unit || '',
            quantity: medicine.quantity ?? '',
            expiry_date: toInputDate(medicine.expiry_date),
            description: medicine.description || '',
          }
        : emptyForm,
    )
  }

  function closeForm() {
    setEditing(null)
    setForm(emptyForm)
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        quantity: form.quantity === '' ? null : Number(form.quantity),
        expiry_date: form.expiry_date || null,
      }

      const currentMedicineId = medicineId(editing)

      if (currentMedicineId) {
        await updateOne('/medicines', currentMedicineId, payload)
      } else {
        await createOne('/medicines', payload)
      }

      setToast({ type: 'success', message: currentMedicineId ? 'Đã cập nhật thuốc.' : 'Đã thêm thuốc.' })
      closeForm()
      refetch()
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await deleteOne('/medicines', medicineId(deleting))
      setToast({ type: 'success', message: 'Đã xóa thuốc.' })
      setDeleting(null)
      refetch()
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    }
  }

  function exportExcel() {
    downloadStyledExcel('danh-sach-thuoc.xls', {
      title: 'Danh sách thuốc',
      rows: [
        ['Danh sách thuốc'],
        ['STT', 'Mã thuốc', 'Tên thuốc', 'Nhóm thuốc', 'Đơn vị', 'Tồn kho', 'Hạn dùng', 'Tình trạng', 'Mô tả'],
        ...visibleItems.map((item, index) => [
          index + 1,
          medicineCode(item),
          item.medicine_name || '',
          item.category?.category_name || '',
          item.unit || '',
          item.quantity ?? '',
          formatDate(item.expiry_date) || '',
          medicineStatus(item),
          item.description || '',
        ]),
      ],
    })
  }

  function resetFilters() {
    setCategoryFilter('')
    setStatusFilter('')
    setParams({ search: '', page: 1, per_page: 20 })
  }

  return (
    <main className="page medicines-page">
      <PageHeader
        title="Quản lý thuốc"
        subtitle="Quản lý danh mục thuốc phục vụ kê toa, theo dõi hạn dùng và tình trạng sử dụng."
        actions={
          <>
            <button type="button" className="primary-button" onClick={() => openForm()}>
              <Plus size={17} /> Thêm thuốc
            </button>
            <button type="button" className="secondary-button" onClick={exportExcel}>
              <FileSpreadsheet size={17} /> Xuất Excel
            </button>
          </>
        }
      />

      <section className="panel medicine-filter-panel">
        <Toolbar
          search={params.search || ''}
          onSearch={(search) => setParams({ search, page: 1, per_page: 20 })}
          placeholder="Tìm tên thuốc"
          filters={
            <div className="medicine-filter-grid">
              <label className="filter-field">
                <span>Nhóm thuốc</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
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
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">Tất cả</option>
                  <option value="Hoạt động">Hoạt động</option>
                  <option value="Sắp hết">Sắp hết</option>
                  <option value="Hết hạn">Hết hạn</option>
                </select>
              </label>
            </div>
          }
          actions={
            <button type="button" className="secondary-button" onClick={resetFilters}>
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
          <form className="stack-form" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Tên thuốc" required>
                <input
                  value={form.medicine_name}
                  onChange={(event) => setForm((current) => ({ ...current, medicine_name: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Nhóm thuốc">
                <select
                  value={form.category_id}
                  onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}
                >
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
                  onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                />
              </Field>
              <Field label="Tồn kho">
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                />
              </Field>
              <Field label="Hạn dùng">
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(event) => setForm((current) => ({ ...current, expiry_date: event.target.value }))}
                />
              </Field>
              <Field label="Mô tả" span={2}>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </Field>
            </div>
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={closeForm}>
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
          onEdit={openForm}
          onDelete={setDeleting}
          emptyTitle="Chưa có thuốc"
        />
      </section>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa thuốc?"
        description="Chỉ xóa được thuốc chưa từng sử dụng trong toa thuốc."
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
