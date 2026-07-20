import { useMemo, useState } from 'react'
import Field from '../ui/Field'

const defaultTimes = ['08:00']

function apiDate(value) {
  return value ? String(value).slice(0, 10) : ''
}

export default function MedicationScheduleForm({
  initialValue,
  prescriptionDetails = [],
  loading,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState({
    prescription_detail_id:
      initialValue?.prescription_detail_id ||
      initialValue?.prescription_detail?.prescription_detail_id ||
      '',
    start_date: apiDate(initialValue?.start_date),
    end_date: apiDate(initialValue?.end_date),
    note: initialValue?.note || '',
    times: initialValue?.times?.length
      ? initialValue.times.map((time) => String(time.time_take || time).slice(0, 5))
      : defaultTimes,
  })

  const selectedDetail = useMemo(
    () =>
      prescriptionDetails.find(
        (detail) => String(detail.prescription_detail_id) === String(form.prescription_detail_id),
      ),
    [form.prescription_detail_id, prescriptionDetails],
  )

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function setTime(index, value) {
    setForm((current) => ({
      ...current,
      times: current.times.map((time, itemIndex) => (itemIndex === index ? value : time)),
    }))
  }

  function addTime() {
    setForm((current) => ({ ...current, times: [...current.times, ''] }))
  }

  function removeTime(index) {
    setForm((current) => ({
      ...current,
      times: current.times.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function submit(event) {
    event.preventDefault()
    onSubmit({
      ...form,
      times: form.times.filter(Boolean),
    })
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Thuốc trong toa" required>
          <select
            value={form.prescription_detail_id}
            onChange={(event) => set('prescription_detail_id', event.target.value)}
            required
          >
            <option value="">Chọn thuốc</option>
            {prescriptionDetails.map((detail) => (
              <option key={detail.prescription_detail_id} value={detail.prescription_detail_id}>
                {detail.medicine?.medicine_name || `Thuốc #${detail.prescription_detail_id}`}
              </option>
            ))}
          </select>
          {selectedDetail?.frequency_type && (
            <span className="field-hint">
              {selectedDetail.frequency_type.type_name || selectedDetail.frequency_type.frequency_name}
            </span>
          )}
        </Field>
        <Field label="Ngày bắt đầu" required>
          <input
            type="date"
            value={form.start_date}
            onChange={(event) => set('start_date', event.target.value)}
            required
          />
        </Field>
        <Field label="Ngày kết thúc" required>
          <input
            type="date"
            value={form.end_date}
            onChange={(event) => set('end_date', event.target.value)}
            required
          />
        </Field>
        <Field label="Ghi chú">
          <textarea value={form.note} onChange={(event) => set('note', event.target.value)} />
        </Field>
      </div>
      <div className="panel">
        <div className="panel-heading">
          <h2>Giờ uống</h2>
          <button type="button" className="secondary-button" onClick={addTime}>
            Thêm giờ
          </button>
        </div>
        <div className="form-grid">
          {form.times.map((time, index) => (
            <Field label={`Lần ${index + 1}`} key={`${index}-${time}`} required>
              <div className="inline-field-actions">
                <input type="time" value={time} onChange={(event) => setTime(index, event.target.value)} />
                {form.times.length > 1 && (
                  <button type="button" className="secondary-button" onClick={() => removeTime(index)}>
                    Xóa
                  </button>
                )}
              </div>
            </Field>
          ))}
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Hủy
        </button>
        <button className="primary-button" disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu lịch'}
        </button>
      </div>
    </form>
  )
}
