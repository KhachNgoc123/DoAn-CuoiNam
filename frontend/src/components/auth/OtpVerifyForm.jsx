export default function OtpVerifyForm({ forgotForm, fieldErrors, loading, disabled, onChange }) {
  return (
    <>
      <label htmlFor="forgot-otp">Mã OTP</label>
      <div className={fieldErrors.otp ? 'field-control-wrap has-error' : 'field-control-wrap'}>
        <input
          id="forgot-otp"
          value={forgotForm.otp}
          placeholder="Nhập 6 số OTP"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          disabled={loading || disabled}
          aria-invalid={Boolean(fieldErrors.otp)}
          onChange={(event) => onChange('otp', event.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        {fieldErrors.otp && <span className="field-error-mark">!</span>}
      </div>
    </>
  )
}
