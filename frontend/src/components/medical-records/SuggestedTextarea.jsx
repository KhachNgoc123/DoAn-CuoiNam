import { useRef, useState } from 'react'

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function SuggestedTextarea({
  value,
  placeholder,
  suggestions = [],
  error = '',
  multiple = false,
  onChange,
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const textareaRef = useRef(null)
  const optionRefs = useRef([])
  const textValue = String(value || '')
  const query = multiple ? currentSegment(textValue) : textValue.trim()

  const keyword = normalize(query)
  const matches =
    keyword.length < 1
      ? suggestions.slice(0, 8)
      : suggestions.filter((suggestion) => normalize(suggestion).includes(keyword)).slice(0, 8)

  function currentSegment(text) {
    return text.split(',').at(-1)?.trim() || ''
  }

  function valueWithSuggestion(suggestion) {
    if (!multiple) return suggestion

    const parts = textValue.split(',')
    parts[parts.length - 1] = ` ${suggestion}`
    return parts.map((part, index) => (index === 0 ? part.trim() : part.trim())).join(', ')
  }

  function chooseSuggestion(suggestion) {
    onChange(valueWithSuggestion(suggestion))
    closeSuggestions()
  }

  function closeSuggestions() {
    setOpen(false)
    setActiveIndex(-1)
  }

  function focusSuggestion(index) {
    if (!matches.length) return
    const nextIndex = (index + matches.length) % matches.length
    setOpen(true)
    setActiveIndex(nextIndex)
    window.requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus())
  }

  function handleSuggestionKeyDown(event, index) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusSuggestion(index + 1)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusSuggestion(index - 1)
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      chooseSuggestion(matches[index])
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSuggestions()
      textareaRef.current?.focus()
    }
  }

  return (
    <div
      className={error ? 'suggested-textarea has-error' : 'suggested-textarea'}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          closeSuggestions()
        }
      }}
    >
      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={textValue}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && open && matches.length > 0) {
            event.preventDefault()
            chooseSuggestion(matches[0])
          }
          if ((event.key === 'Tab' && !event.shiftKey) || event.key === 'ArrowDown') {
            if (open && matches.length > 0) {
              event.preventDefault()
              focusSuggestion(0)
            }
          }
          if (event.key === 'ArrowUp' && open && matches.length > 0) {
            event.preventDefault()
            focusSuggestion(matches.length - 1)
          }
          if (event.key === 'Escape') {
            closeSuggestions()
          }
        }}
      />
      {error && (
        <span className="field-error-mark" aria-label={error}>
          !
        </span>
      )}
      {open && matches.length > 0 && (
        <div className="medical-suggestion-list">
          {matches.map((suggestion, index) => (
            <button
              type="button"
              key={suggestion}
              ref={(element) => {
                optionRefs.current[index] = element
              }}
              className={activeIndex === index ? 'is-active' : undefined}
              tabIndex={activeIndex === index ? 0 : -1}
              onFocus={() => {
                setOpen(true)
                setActiveIndex(index)
              }}
              onKeyDown={(event) => handleSuggestionKeyDown(event, index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
