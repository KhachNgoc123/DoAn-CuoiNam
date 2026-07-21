/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import Field from '../ui/Field'

export default function AddressField({
    fieldErrors,

    provinceInputRef,
    wardInputRef,

    provinceQuery,
    wardQuery,

    provinceOpen,
    wardOpen,

    provinceSuggestions,
    wardSuggestions,

    provinceSuggestionRefs,
    wardSuggestionRefs,

    selectedProvince,

    addressLoading,

    addressDetail,

    keepSuggestionsOpenOnInternalFocus,

    handleSuggestionInputKeyDown,
    handleSuggestionKeyDown,

    changeProvinceQuery,
    changeWardQuery,
    changeAddressDetail,

    chooseProvince,
    chooseWard,

    setProvinceOpen,
    setWardOpen,
}) {

    return (
        <Field label="Địa chỉ" span={2} required>

            <div className="address-assist-grid">

                {/* Tỉnh */}

                <div className="field">

                    <span>Tỉnh/Thành phố</span>

                    <div
                        className="address-suggest-box"
                        onBlur={(event) =>
                            keepSuggestionsOpenOnInternalFocus(
                                event,
                                () => setProvinceOpen(false)
                            )
                        }
                    >

                        <input
                            ref={provinceInputRef}
                            value={provinceQuery}
                            placeholder="Nhập tỉnh/thành phố"
                            onFocus={() => setProvinceOpen(true)}
                            onKeyDown={(event) =>
                                handleSuggestionInputKeyDown(
                                    event,
                                    provinceSuggestions,
                                    provinceSuggestionRefs
                                )
                            }
                            onChange={(event) =>
                                changeProvinceQuery(event.target.value)
                            }
                        />

                        {provinceOpen && (
                            <div className="address-suggest-list">

                                {provinceSuggestions.length ? (
                                    provinceSuggestions.map((province, index) => (

                                        <button
                                            type="button"
                                            key={province.code}
                                            ref={(el) =>
                                                provinceSuggestionRefs.current[index] = el
                                            }
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => chooseProvince(province)}
                                            onKeyDown={(event) =>
                                                handleSuggestionKeyDown(
                                                    event,
                                                    index,
                                                    provinceSuggestions,
                                                    provinceSuggestionRefs,
                                                    provinceInputRef,
                                                    () => setProvinceOpen(false)
                                                )
                                            }
                                        >
                                            {province.name}
                                        </button>

                                    ))
                                ) : (

                                    <span>Không tìm thấy</span>

                                )}

                            </div>
                        )}

                    </div>

                </div>

                {/* Phường */}

                <div className="field">

                    <span>Phường/Xã</span>

                    <div
                        className="address-suggest-box"
                        onBlur={(event) =>
                            keepSuggestionsOpenOnInternalFocus(
                                event,
                                () => setWardOpen(false)
                            )
                        }
                    >

                        <input
                            ref={wardInputRef}
                            value={wardQuery}
                            disabled={!selectedProvince || addressLoading}
                            placeholder={
                                addressLoading
                                    ? "Đang tải..."
                                    : "Nhập phường/xã"
                            }
                            onFocus={() => setWardOpen(Boolean(selectedProvince))}
                            onChange={(event) =>
                                changeWardQuery(event.target.value)
                            }
                        />

                        {wardOpen && selectedProvince && (

                            <div className="address-suggest-list">

                                {wardSuggestions.length ? (
                                    wardSuggestions.map((ward, index) => (

                                        <button
                                            key={ward.code}
                                            type="button"
                                            ref={(el) =>
                                                wardSuggestionRefs.current[index] = el
                                            }
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => chooseWard(ward)}
                                        >
                                            {ward.name}
                                        </button>

                                    ))
                                ) : (

                                    <span>Không tìm thấy</span>

                                )}

                            </div>

                        )}

                    </div>

                </div>

                {/* Địa chỉ cụ thể */}

                <label className="field">

                    <span>Địa chỉ cụ thể</span>

                    <input
                        value={addressDetail}
                        onChange={(event) =>
                            changeAddressDetail(event.target.value)
                        }
                    />

                    {fieldErrors.address && (
                        <div className="form-error">
                            {fieldErrors.address}
                        </div>
                    )}

                </label>

            </div>

        </Field>
    )
}