/**
 * File thuộc nhóm pages, điều phối dữ liệu của từng màn hình trước khi truyền xuống component hiển thị.
 */

import { useEffect, useMemo, useState } from 'react'
import useResourceList from '../../api/useResourceList'
import { createOne, deleteOne, getList, updateOne } from '../../api/resources'
import { getErrorMessage } from '../../api/client'
import StatusBadge from '../../components/ui/StatusBadge'
import MedicinesView from '../../components/medicines/MedicinesView'
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

/**
 * ?i?u ph?i d? li?u v? hi?n th? m?n h?nh Medicines.
 */
export default function MedicinesPage() {
  const { items, params, setParams, loading, refetch } = useResourceList('/medicines', { per_page: 20 })
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
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
    <MedicinesView
      params={params}
      categories={categories}
      categoryFilter={categoryFilter}
      statusFilter={statusFilter}
      stats={stats}
      editing={editing}
      form={form}
      saving={saving}
      deleting={deleting}
      toast={toast}
      columns={columns}
      visibleItems={visibleItems}
      loading={loading}
      medicineId={medicineId}
      onOpenForm={openForm}
      onCloseForm={closeForm}
      onSubmit={submit}
      onFormChange={(next) => setForm((current) => ({ ...current, ...next }))}
      onSearch={(search) => setParams({ search, page: 1, per_page: 20 })}
      onCategoryFilterChange={setCategoryFilter}
      onStatusFilterChange={setStatusFilter}
      onResetFilters={resetFilters}
      onExportExcel={exportExcel}
      onDelete={setDeleting}
      onCancelDelete={() => setDeleting(null)}
      onConfirmDelete={confirmDelete}
      onCloseToast={() => setToast(null)}
    />
  )
}
