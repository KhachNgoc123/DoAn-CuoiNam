/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import Field from "../ui/Field";

export default function UnderlyingDiseaseField({
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
        <Field label="Bệnh nền / tiền sử bệnh" span={2}>
            <div
                className="address-suggest-box"
                onBlur={(event) =>
                    keepSuggestionsOpenOnInternalFocus(
                        event,
                        () => setOpen(false)
                    )
                }
            >
                <textarea
                    ref={inputRef}
                    value={value}
                    placeholder="Nhập bệnh nền..."
                    onFocus={() => setOpen(true)}
                    onKeyDown={(event) =>
                        handleSuggestionInputKeyDown(
                            event,
                            suggestions,
                            suggestionRefs
                        )
                    }
                    onChange={(event) => {
                        set(event.target.value)
                        setOpen(true)
                    }}
                />

                {open && (
                    <div className="address-suggest-list">
                        {suggestions.length ? (
                       suggestions.map((item, index) => (
  <button
    key={item.id}
    type="button"
    ref={(el) => (suggestionRefs.current[index] = el)}
    onMouseDown={(e) => e.preventDefault()}
    onClick={() => chooseSuggestion(item.disease_name)}
    onKeyDown={(event) =>
      handleSuggestionKeyDown(
        event,
        index,
        suggestions,
        suggestionRefs,
        inputRef,
        () => setOpen(false)
      )
    }
  >
    {item.disease_name}
  </button>
))
                        ) : (
                            <span>Không có bệnh nền phù hợp</span>
                        )}
                    </div>
                )}
            </div>
        </Field>
    );
}