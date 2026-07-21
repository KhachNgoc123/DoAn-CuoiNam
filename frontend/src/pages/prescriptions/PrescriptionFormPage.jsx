/**
 * File thuộc nhóm pages, điều phối dữ liệu của từng màn hình trước khi truyền xuống component hiển thị.
 */

import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createOne, getList, getOne, updateOne } from '../../api/resources'
import { getErrorMessage } from '../../api/client'
import PageHeader from '../../components/ui/PageHeader'
import LoadingState from '../../components/ui/LoadingState'
import PrescriptionForm from '../../components/prescriptions/PrescriptionForm'
import Toast from '../../components/ui/Toast'
import EmptyState from '../../components/ui/EmptyState'

/**
 * Điều phối dữ liệu và hiển thị màn hình PrescriptionForm.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.mode Giá trị mode được dùng để render hoặc xử lý tương tác.
 * @param {*} props.prescriptionId Giá trị prescriptionId được dùng để render hoặc xử lý tương tác.
 * @param {*} props.recordId Giá trị recordId được dùng để render hoặc xử lý tương tác.
 * @param {*} props.record Giá trị record được dùng để render hoặc xử lý tương tác.
 * @param {*} props.workflow Giá trị workflow được dùng để render hoặc xử lý tương tác.
 */
export default function PrescriptionFormPage({ mode, prescriptionId, recordId, record, workflow }) {
  const { id: routeId } = useParams()
  const id = prescriptionId || routeId
  const isEdit = mode === 'edit' || Boolean(id)
  const location = useLocation()
  const navigate = useNavigate()
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [initialValue, setInitialValue] = useState(null)
  const [records, setRecords] = useState([])
  const [medicines, setMedicines] = useState([])
  const [frequencyTypes, setFrequencyTypes] = useState([])
  const [mealTimes, setMealTimes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recordAccessDenied, setRecordAccessDenied] = useState(false)
  const [toast, setToast] = useState(() => location.state?.toast || null)

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    const routeToast = location.state?.toast
    if (!routeToast) return
    navigate(location.pathname, {
      replace: true,
      state: { ...location.state, toast: null },
    })
  }, [location.pathname, location.state, navigate])

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    Promise.all([
      getList('/medical-records', { per_page: 50, prescribable: 1 }),
      getList('/medicines', { per_page: 50 }),
      getList('/frequency-types', { per_page: 50 }),
      getList('/meal-times', { per_page: 50 }),
      isEdit ? getOne('/prescriptions', id) : Promise.resolve(null),
    ])
      .then(([recordResult, medicineResult, frequencyResult, mealTimeResult, prescription]) => {
        const availableRecords = [...recordResult.items]
        const requestedRecordId = recordId || prescription?.record_id || ''
        if (
          record &&
          !availableRecords.some((item) => String(item.record_id) === String(record.record_id))
        ) {
          availableRecords.unshift(record)
        }
        const requestedRecordIsAvailable =
          !requestedRecordId ||
          availableRecords.some((record) => String(record.record_id) === String(requestedRecordId))
        if (
          prescription?.medical_record &&
          !availableRecords.some((record) => record.record_id === prescription.record_id)
        ) {
          availableRecords.push(prescription.medical_record)
        }
        setRecordAccessDenied(!isEdit && Boolean(recordId) && !requestedRecordIsAvailable)
        setRecords(availableRecords)
        setMedicines(medicineResult.items)
        setFrequencyTypes(frequencyResult.items || frequencyResult)
        setMealTimes(mealTimeResult.items || mealTimeResult)
        setInitialValue(prescription || { record_id: recordId || '', medical_record: record })
      })
      .catch((error) => setToast({ type: 'error', message: getErrorMessage(error) }))
      .finally(() => setLoading(false))
  }, [id, isEdit, record, recordId])

  async function submit(payload) {
    setSaving(true)
    try {
      const saved = isEdit
        ? await updateOne('/prescriptions', id, payload)
        : await createOne('/prescriptions', payload)
      if (isEdit) {
        navigate(`/prescriptions/${saved.prescription_id || id}`, {
          state: {
            toast: { type: 'success', message: 'Đã cập nhật toa thuốc.' },
            viewPrescriptionId: saved.prescription_id || id,
          },
        })
        return
      }
      const savedId = saved.prescription_id || saved.id
      navigate(`/prescriptions/${savedId}`, {
        state: {
          toast: {
            type: 'success',
            message: 'Toa thuốc đã được lưu thành công. Lịch uống thuốc đã được đồng bộ từ đơn thuốc.',
          },
          viewPrescriptionId: savedId,
        },
      })
      return
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <main className="page">
        <LoadingState />
      </main>
    )
  }

  if (
    (!isEdit && (records.length === 0 || recordAccessDenied)) ||
    (isEdit && initialValue && !initialValue.can_modify)
  ) {
    return (
      <main className="page">
        <PageHeader title={isEdit ? 'Sửa toa thuốc' : 'Kê toa thuốc'} />
        <EmptyState
          title={
            isEdit
          ? 'Toa thuốc thuộc hồ sơ đã hoàn thành, không thể chỉnh sửa.'
              : recordAccessDenied
          ? 'Hồ sơ bệnh án đã hoàn thành, không thể kê toa thuốc mới.'
                : 'Không có hồ sơ đang điều trị để kê toa'
          }
          description={
            isEdit || recordAccessDenied
          ? 'Vui lòng tạo hồ sơ bệnh án mới cho lần điều trị này.'
              : ''
          }
        />
      </main>
    )
  }

  return (
    <main className="page">
      <PageHeader
        title={isEdit ? 'Sửa toa thuốc' : 'Kê toa thuốc'}
        subtitle="Dữ liệu lưu vào prescriptions và prescription_details."
        actions={
          <button className="secondary-button" onClick={() => navigate('/prescriptions')}>
            <ArrowLeft size={18} /> Quay lại
          </button>
        }
      />
      <section className="panel">
        <PrescriptionForm
          initialValue={initialValue}
          medicalRecords={records}
          medicines={medicines}
          frequencyTypes={frequencyTypes}
          mealTimes={mealTimes}
          workflow={workflow}
          loading={saving}
          onSubmit={submit}
          onCancel={() => navigate('/prescriptions')}
        />
      </section>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  )
}
