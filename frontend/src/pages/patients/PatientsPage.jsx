/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { createPatient, getPatients } from '../../services/patientService'//chỗ này sửa
import { Plus } from 'lucide-react'
//form thêm bệnh nhân
import PatientForm from '../../components/patients/PatientForm'//lấy bên trang PatientForm

export default function PatientsPage() {

    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)

    const loadPatients = useCallback(async () => {
        setLoading(true)

        try {
            const response = await getPatients()//gọi api authApi
            setPatients(response.data)//hiển thị dữ liệu
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadPatients()
    }, [loadPatients])
//hàm lưu   
async function savePatient(payload) {
    try {
        await createPatient(payload)

        alert("Thêm bệnh nhân thành công")

        setShowForm(false)

        loadPatients()
    } catch (error) {
        console.log(error)
    }
}
//liên kết (gọi) component
  if(showForm){
            return(
                <PatientForm
                initialValue={{}}
                loading={false}
                onSubmit={savePatient}
                onCancel={() => setShowForm(false)} //prop
                />
                
            )
        }
    return (
      
        <div>
          <section className="mc-list-hero">
        <div>
          <h1>Danh sách bệnh nhân</h1>
        </div>
        <button
          className="primary-button mc-add-button"
          onClick={() => {
            setShowForm(true)
          }}
        >
          <Plus size={18} /> Thêm bệnh nhân
        </button>
      </section>
            <table>
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Họ tên</th>
                        <th>Giới tính</th>
                        <th>SĐT</th>
                        <th>Địa chỉ</th>
                        <th>Hành động</th>
                    </tr>
                
                </thead>

                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan="5">Đang tải...</td>
                        </tr>
                    ) : (
                        patients.map((patient, index) => (
                            <tr key={patient.patient_id}>
                                <td>{index + 1}</td>
                                <td>{patient.full_name}</td>
                                <td>{patient.gender}</td>
                                <td>{patient.phone}</td>
                                <td>{patient.address}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
