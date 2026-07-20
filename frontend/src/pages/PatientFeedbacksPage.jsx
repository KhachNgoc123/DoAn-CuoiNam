import { useEffect, useState } from 'react'
import useResourceList from '../api/useResourceList'
import { getList } from '../api/resources'
import PatientFeedbacksView from '../components/feedbacks/PatientFeedbacksView'
import { formatDate } from '../utils/formatters'
import { downloadStyledExcel } from '../utils/excelExport'

function feedbackCode(item) {
  return `PH${String(item.feedback_id || item.id || '').padStart(3, '0')}`
}

function patientName(item) {
  return item.patient?.full_name || item.patient_name || '-'
}

function patientPhone(item) {
  return item.patient?.phone || item.patient_phone || '-'
}

export default function PatientFeedbacksPage() {
  const { items, params, setParams, loading } = useResourceList('/patient-feedbacks', { per_page: 20 })
  const [patients, setPatients] = useState([])
  const [viewing, setViewing] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    getList('/patients', { per_page: 50, scope: 'all' })
      .then((result) => setPatients(result.items))
      .catch(() => setPatients([]))
  }, [])

  function updateFilters(next) {
    setParams({ ...next, page: 1, per_page: 20 })
  }

  function exportExcel() {
    downloadStyledExcel('danh-sach-phan-hoi-nguoi-benh.xls', {
      title: 'Danh sÃ¡ch pháº£n há»“i ngÆ°á»i bá»‡nh',
      rows: [
        ['Danh sÃ¡ch pháº£n há»“i'],
        ['STT', 'MÃ£ PH', 'Bá»‡nh nhÃ¢n', 'Sá»‘ Ä‘iá»‡n thoáº¡i', 'TiÃªu Ä‘á»', 'NgÃ y gá»­i', 'Ná»™i dung'],
        ...items.map((item, index) => [
          index + 1,
          feedbackCode(item),
          patientName(item),
          patientPhone(item),
          item.title || '',
          formatDate(item.feedback_date || item.created_at),
          item.content || '',
        ]),
      ],
    })
  }

  return (
    <PatientFeedbacksView
      items={items}
      params={params}
      patients={patients}
      loading={loading}
      viewing={viewing}
      toast={toast}
      feedbackCode={feedbackCode}
      patientName={patientName}
      patientPhone={patientPhone}
      onExportExcel={exportExcel}
      onPrint={() => window.print()}
      onUpdateFilters={updateFilters}
      onViewFeedback={(item) => setViewing(item)}
      onCloseFeedback={() => setViewing(null)}
      onCloseToast={() => setToast(null)}
    />
  )
}
