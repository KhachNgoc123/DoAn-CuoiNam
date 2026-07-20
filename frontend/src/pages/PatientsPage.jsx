import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createPatient,
  getPatients,
  updatePatient,
} from '../api/patientApi'
import PatientForm from '../components/patients/PatientForm'
import PatientsListView from '../components/patients/PatientsListView'

export default function PatientsPage() {
  const navigate = useNavigate()

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPatient, setEditingPatient] = useState(null)

  useEffect(() => {
    loadPatients()
  }, [])

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

  async function savePatient(payload) {
    try {
      if (editingPatient) {
        await updatePatient(editingPatient.patient_id, payload)
        alert('Cập nhật bệnh nhân thành công')
      } else {
        await createPatient(payload)
        alert('Thêm bệnh nhân thành công')
      }

      setShowForm(false)
      setEditingPatient(null)
      await loadPatients()
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