/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

export default function Field({ label, children, span = 1, required = false }) {
  return (
    <label className={span === 2 ? 'field field-wide' : 'field'}>
      <span>
        {label}
        {required && (
          <strong className="required-mark" aria-label="Bắt buộc">
            *
          </strong>
        )}
      </span>
      {children}
    </label>
  )
}
