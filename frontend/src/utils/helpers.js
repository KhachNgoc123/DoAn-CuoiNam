export function asArray(value) {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

