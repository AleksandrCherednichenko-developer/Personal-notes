import { normalizeCategories } from '../domain'
import {
  DEFAULT_NOTES_LIST_STATE,
  NOTE_SORT,
  SORT_ORDER,
} from './types'
import type { NoteSort, NotesListState, SortOrder } from './types'

export type NotesListQuery = Record<string, string | string[]>

const isNoteSort = (value: unknown): value is NoteSort => (
  typeof value === 'string'
  && Object.values(NOTE_SORT).some(sort => sort === value)
)

const isSortOrder = (value: unknown): value is SortOrder => (
  typeof value === 'string'
  && Object.values(SORT_ORDER).some(order => order === value)
)

const getSingleValue = (value: unknown): string | null => (
  typeof value === 'string' ? value : null
)

const getCategoryValues = (value: unknown): string[] => {
  if (typeof value === 'string') return [value]
  if (!Array.isArray(value)) return []
  return value.filter((category): category is string => typeof category === 'string')
}

export const parseNotesListQuery = (
  query: Readonly<Record<string, unknown>>,
): NotesListState => {
  const rawQuery = getSingleValue(query.q)
  const rawSort = getSingleValue(query.sort)
  const rawOrder = getSingleValue(query.order)

  return {
    query: rawQuery?.trim() ?? DEFAULT_NOTES_LIST_STATE.query,
    categories: normalizeCategories(getCategoryValues(query.category)),
    sort: isNoteSort(rawSort) ? rawSort : DEFAULT_NOTES_LIST_STATE.sort,
    order: isSortOrder(rawOrder) ? rawOrder : DEFAULT_NOTES_LIST_STATE.order,
  }
}

export const serializeNotesListQuery = (state: NotesListState): NotesListQuery => {
  const query: NotesListQuery = {}
  const normalizedQuery = state.query.trim()
  const normalizedCategories = normalizeCategories(state.categories)

  if (normalizedQuery !== '') query.q = normalizedQuery
  if (normalizedCategories.length > 0) query.category = normalizedCategories
  if (state.sort !== DEFAULT_NOTES_LIST_STATE.sort) query.sort = state.sort
  if (state.order !== DEFAULT_NOTES_LIST_STATE.order) query.order = state.order

  return query
}
