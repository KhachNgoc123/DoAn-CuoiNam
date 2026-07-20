import { Camera, ImagePlus } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import CameraCaptureDialog from './CameraCaptureDialog'
import DoctorAvatar from './DoctorAvatar'

export default function AvatarPicker({ avatar, name, onChange }) {
  const [preview, setPreview] = useState('')
  const previewUrlRef = useRef('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const inputId = useId()

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    },
    [],
  )

  function chooseImage(file) {
    if (!file) return
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    const url = URL.createObjectURL(file)
    previewUrlRef.current = url
    setPreview(url)
    onChange(file)
  }

  return (
    <div className="avatar-picker">
      <DoctorAvatar avatar={preview || avatar} name={name} />
      <div className="avatar-picker-actions">
        <label className="secondary-button" htmlFor={inputId}>
          <ImagePlus size={16} /> Chọn ảnh
        </label>
        <input
          id={inputId}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => chooseImage(event.target.files?.[0])}
        />
        <button type="button" className="secondary-button" onClick={() => setCameraOpen(true)}>
          <Camera size={16} /> Chụp ảnh
        </button>
      </div>
      {cameraOpen && (
        <CameraCaptureDialog onCapture={chooseImage} onClose={() => setCameraOpen(false)} />
      )}
    </div>
  )
}
