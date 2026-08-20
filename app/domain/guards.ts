import { PERSISTED_SCHEMA_VERSION } from './types'
import { isIsoDateString, isRecord } from './runtime-guards'
import type {
  DraftEnvelope,
  Note,
  PersistedNotesEnvelope,
  Todo,
} from './types'

type ItemGuard<TItem> = (value: unknown) => value is TItem

const isNonEmptyTrimmedString = (value: unknown): value is string => (
  typeof value === 'string' && value !== '' && value === value.trim()
)

const areNormalizedCategories = (value: unknown): value is string[] => {
  if (!Array.isArray(value) || !value.every(isNonEmptyTrimmedString)) {
    return false
  }

  const comparisonKeys = value.map(category => category.toLowerCase())

  return new Set(comparisonKeys).size === comparisonKeys.length
}

export const isTodo = (value: unknown): value is Todo => (
  isRecord(value)
  && isNonEmptyTrimmedString(value.id)
  && isNonEmptyTrimmedString(value.text)
  && typeof value.completed === 'boolean'
)

export const isNote = (value: unknown): value is Note => (
  isRecord(value)
  && isNonEmptyTrimmedString(value.id)
  && isNonEmptyTrimmedString(value.title)
  && Array.isArray(value.todos)
  && value.todos.every(isTodo)
  && areNormalizedCategories(value.categories)
  && isIsoDateString(value.createdAt)
  && isIsoDateString(value.updatedAt)
)

export const isPersistedNotesEnvelope = (
  value: unknown,
): value is PersistedNotesEnvelope => (
  isRecord(value)
  && value.schemaVersion === PERSISTED_SCHEMA_VERSION
  && Array.isArray(value.notes)
  && value.notes.every(isNote)
)

export const isDraftEnvelope = <TDraft>(
  value: unknown,
  isDraft: ItemGuard<TDraft>,
): value is DraftEnvelope<TDraft> => (
  isRecord(value)
  && value.schemaVersion === PERSISTED_SCHEMA_VERSION
  && Array.isArray(value.drafts)
  && value.drafts.every(isDraft)
)
