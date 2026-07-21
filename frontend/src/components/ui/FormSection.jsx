/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

export default function FormSection({ title, description, children }) {
  return (
    <section className="form-section">
      <div className="form-section-heading">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      <div className="form-grid">{children}</div>
    </section>
  )
}
