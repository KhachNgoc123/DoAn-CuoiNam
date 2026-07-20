
export default function Search({ value, onChange, placeholder = "Tìm kiếm", ...props }) {
  return (
    <input
      className="search-input"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange?.(event.target.value)}
      {...props}
    />
  )
}
