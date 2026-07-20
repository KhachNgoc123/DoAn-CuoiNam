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
