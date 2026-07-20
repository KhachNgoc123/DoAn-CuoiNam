
export default function Button({ className = "", type = "button", children, ...props }) {
  return (
    <button type={type} className={className || "primary-button"} {...props}>
      {children}
    </button>
  )
}
