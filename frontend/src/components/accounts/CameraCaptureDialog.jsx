import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

export default function CameraCaptureDialog({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    navigator.mediaDevices
      ?.getUserMedia({ video: true })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch(() => setError('Không mở được camera.'))

    return () => {
      active = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function capture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      onCapture(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
      onClose()
    }, 'image/jpeg')
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <div>
            <span>Camera</span>
            <h2>Chụp ảnh đại diện</h2>
          </div>
          <button className="icon-button" title="Đóng" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {error ? <div className="form-error">{error}</div> : <video ref={videoRef} autoPlay playsInline />}
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Hủy
          </button>
          <button type="button" className="primary-button" onClick={capture}>
            <Camera size={16} /> Chụp
          </button>
        </div>
      </section>
    </div>
  )
}
