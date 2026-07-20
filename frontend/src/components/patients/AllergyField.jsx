import Field from '../ui/Field'
export default function AllergyPatient(){
return(


 <Field label="Dị ứng" span={2}>
          <div
            className="address-suggest-box"
            onBlur={(event) => keepSuggestionsOpenOnInternalFocus(event, () => setAllergyOpen(false))}
          >
            <textarea
              ref={allergyInputRef}
              value={form.allergy}
              placeholder="Dị ứng thuốc, thức ăn hoặc phản ứng từng gặp. Nếu không có có thể để trống."
              onFocus={() => setAllergyOpen(true)}
              onKeyDown={(event) =>
                handleSuggestionInputKeyDown(event, allergySuggestions, allergySuggestionRefs)
              }
              onChange={(event) => {
                set('allergy', event.target.value)
                setAllergyOpen(true)
              }}
            />
            {allergyOpen && (
              <div className="address-suggest-list">
                {allergySuggestions.length ? (
                  allergySuggestions.map((suggestion, index) => (
                    <button
                      type="button"
                      ref={(element) => {
                        allergySuggestionRefs.current[index] = element
                      }}
                      key={suggestion}
                      onKeyDown={(event) =>
                        handleSuggestionKeyDown(
                          event,
                          index,
                          allergySuggestions,
                          allergySuggestionRefs,
                          allergyInputRef,
                          () => setAllergyOpen(false),
                        )
                      }
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseAllergySuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))
                ) : (
                  <span>Không có dị ứng phù hợp</span>
                )}
              </div>
            )}
          </div>
        </Field>
);
}