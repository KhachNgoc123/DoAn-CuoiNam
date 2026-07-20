import { useEffect, useState } from 'react'
import { createPatient, getPatients, updatePatient } from '../api/patientApi'
import PatientForm from '../components/patients/PatientForm'
import PatientsListView from '../components/patients/PatientsListView'

export default function PatientsPage() {
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
      setPatients(response.data)
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }

  async function savePatient(payload) {
    try {
      if (editingPatient) {
        await updatePatient(editingPatient.patient_id, payload)
        alert('Cáº­p nháº­t bá»‡nh nhÃ¢n thÃ nh cÃ´ng')
      } else {
        await createPatient(payload)
        alert('ThÃªm bá»‡nh nhÃ¢n thÃ nh cÃ´ng')
      }
      setShowForm(false)
      setEditingPatient(null)
      loadPatients()
    } catch (error) {
      console.log(error)
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
      onView={(patient) => console.log(patient)}
    />
  )
}
