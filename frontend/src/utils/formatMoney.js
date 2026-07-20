export function formatMoney(value, locale = 'vi-VN', currency = 'VND') {
  const amount = Number(value || 0)
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

