export type UnknownRecord = Record<PropertyKey, unknown>

export const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' && value !== null
)

export const isIsoDateString = (value: unknown): value is string => {
  if (typeof value !== 'string') return false

  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toISOString() === value
}
