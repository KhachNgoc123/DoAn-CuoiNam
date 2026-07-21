/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import Field from '../ui/Field'

export default function AllergyField({
  value,
  suggestions,
  open,
  inputRef,
  suggestionRefs,
  set,
  setOpen,
  handleSuggestionInputKeyDown,
  handleSuggestionKeyDown,
  keepSuggestionsOpenOnInternalFocus,
  chooseSuggestion,
}) {
  return (
    <Field label="Dị ứng" span={2}>
      <div
        className="address-suggest-box"
        onBlur={(event) => keepSuggestionsOpenOnInternalFocus(event, () => setOpen(false))}
      >
        <textarea
          ref={inputRef}
          value={value}
          placeholder="Dị ứng thuốc, thức ăn hoặc phản ứng từng gặp. Nếu không có có thể để trống."
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => handleSuggestionInputKeyDown(event, suggestions, suggestionRefs)}
          onChange={(event) => {
            set(event.target.value)
            setOpen(true)
          }}
        />

        {open && (
          <div className="address-suggest-list">
            {suggestions.length ? (
              suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  ref={(el) => {
                    suggestionRefs.current[index] = el
                  }}
                  onKeyDown={(event) =>
                    handleSuggestionKeyDown(
                      event,
                      index,
                      suggestions,
                      suggestionRefs,
                      inputRef,
                      () => setOpen(false),
                    )
                  }
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseSuggestion(suggestion.allergy_name)}
                >
                  {suggestion.allergy_name}
                </button>
              ))
            ) : (
              <span>Không có dị ứng phù hợp</span>
            )}
          </div>
        )}
      </div>
    </Field>
  )
}
