/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { Camera, ImagePlus } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import CameraCaptureDialog from './CameraCaptureDialog'
import DoctorAvatar from './DoctorAvatar'

/**
 * Hiển thị component AvatarPicker trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.avatar Giá trị avatar được dùng để render hoặc xử lý tương tác.
 * @param {*} props.name Giá trị name được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onChange Giá trị onChange được dùng để render hoặc xử lý tương tác.
 */
export default function AvatarPicker({ avatar, name, onChange }) {
  // Nhóm state trong file này quản lý dữ liệu hiển thị, loading, lỗi và trạng thái form/modal liên quan.
  const [preview, setPreview] = useState('')
  const previewUrlRef = useRef('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const inputId = useId()

  // useEffect chạy khi màn hình mount hoặc dependency thay đổi để đồng bộ dữ liệu cần hiển thị.
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
