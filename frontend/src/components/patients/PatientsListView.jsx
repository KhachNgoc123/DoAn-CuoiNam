import { Eye, Pencil, Plus } from 'lucide-react'

export default function PatientsListView({ patients, loading, onCreate, onEdit, onView }) {
  return (
    <div>
      <section className="mc-list-hero">
        <div>
          <h1>Danh sÃ¡ch bá»‡nh nhÃ¢n</h1>
        </div>
        <button className="primary-button mc-add-button" onClick={onCreate}>
          <Plus size={18} /> ThÃªm bá»‡nh nhÃ¢n
        </button>
      </section>

      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Há» tÃªn</th>
            <th>Giá»›i tÃ­nh</th>
            <th>SÄT</th>
            <th>Äá»‹a chá»‰</th>
            <th>Thao tÃ¡c</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan="6">Äang táº£i...</td>
            </tr>
          ) : (
            patients.map((patient, index) => (
              <tr key={patient.patient_id}>
                <td>{index + 1}</td>
                <td>{patient.full_name}</td>
                <td>{patient.gender}</td>
                <td>{patient.phone}</td>
                <td>{patient.address}</td>
                <td>
                  <div className="mc-row-actions">
                    <button
                      type="button"
                      className="icon-button small"
                      title="Xem chi tiáº¿t"
                      onClick={() => onView(patient)}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button small"
                      title="Sá»­a bá»‡nh nhÃ¢n"
                      onClick={() => onEdit(patient)}
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
