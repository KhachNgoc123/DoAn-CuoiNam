/**
 * File thuộc nhóm pages, điều phối dữ liệu của từng màn hình trước khi truyền xuống component hiển thị.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createPatient,
  getPatients,
  updatePatient,
} from '../../api/patientApi'
import PatientForm from '../../components/patients/PatientForm'
import PatientsListView from '../../components/patients/PatientsListView'


export default function PatientsPage() {
  const navigate = useNavigate()

  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPatient, setEditingPatient] = useState(null)

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
  useEffect(() => {
    loadPatients()
  }, [])

  // Hàm loadPatients nạp dữ liệu từ API hoặc nguồn dữ liệu hiện có để cập nhật giao diện.
  async function loadPatients() {
    setLoading(true)

    try {
      const response = await getPatients()
      setPatients(response.data || [])
    } catch (error) {
      console.error(error)
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  // Hàm savePatient gửi dữ liệu mới lên API hoặc component cha.
 async function savePatient(payload) {
  try {
    if (editingPatient) {
      await updatePatient(editingPatient.patient_id, payload)
      alert('Cập nhật bệnh nhân thành công')

      setShowForm(false)
      setEditingPatient(null)
      await loadPatients()
    } else {
     const response = await createPatient(payload);

console.log(response);

const newPatient = response.data;

console.log(newPatient);

navigate("/medical-records", {
  state: {
    patient: newPatient,
  },
});
    }
  } catch (error) {
    console.error(error)
  }
}

  if (showForm) {
    return (
      <PatientForm
        initialValue={editingPatient || {}}
        loading={false}
        onSubmit={savePatient}
        onCancel={() => {
          setShowForm(false)
          setEditingPatient(null)
        }}
      />
    )
  }

  return (
    <PatientsListView
      patients={patients}
      loading={loading}
      onCreate={() => {
        setEditingPatient(null)
        setShowForm(true)
      }}
      onEdit={(patient) => {
        setEditingPatient(patient)
        setShowForm(true)
      }}
      onView={(patient) => {
        navigate(`/patients/${patient.patient_id}`)
      }}
    />
  )
}