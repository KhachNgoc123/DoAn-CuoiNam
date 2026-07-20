import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

export default function Toolbar({
  search,
  onSearch,
  filters,
  actions,
  placeholder = 'Tìm kiếm...',
}) {
  const [localSearch, setLocalSearch] = useState(search || '')

  useEffect(() => {
    if (!onSearch || localSearch === (search || '')) return undefined

    const timer = window.setTimeout(() => {
      onSearch(localSearch)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [localSearch, onSearch, search])

  return (
    <div className="toolbar">
      {onSearch && (
        <div className="search-input">
          <Search size={18} />
          <input
            value={localSearch}
            placeholder={placeholder}
            onChange={(event) => setLocalSearch(event.target.value)}
          />
        </div>
      )}
      {filters && <div className="toolbar-filters">{filters}</div>}
      {actions && <div className="toolbar-actions">{actions}</div>}
    </div>
  )
}
