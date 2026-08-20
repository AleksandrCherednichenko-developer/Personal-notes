import { NOTE_SORT, SORT_ORDER } from './types'
import type { Note } from '../domain'
import type { NoteSort, NotesListState } from './types'

const normalizeForComparison = (value: string): string => value.trim().toLowerCase()

export const getNoteProgress = (note: Note): number => {
  if (note.todos.length === 0) return 0
  const completedCount = note.todos.filter(todo => todo.completed).length
  return completedCount / note.todos.length
}

const matchesSearch = (note: Note, query: string): boolean => {
  const normalizedQuery = normalizeForComparison(query)
  if (normalizedQuery === '') return true

  return [
    note.title,
    ...note.todos.map(todo => todo.text),
    ...note.categories,
  ].some(value => normalizeForComparison(value).includes(normalizedQuery))
}

const matchesCategories = (note: Note, categories: readonly string[]): boolean => {
  if (categories.length === 0) return true

  const noteCategoryKeys = new Set(note.categories.map(normalizeForComparison))
  return categories.some(category => noteCategoryKeys.has(normalizeForComparison(category)))
}

const compareText = (left: string, right: string): number => left.localeCompare(
  right,
  'ru',
  { sensitivity: 'base' },
)

const compareByCriterion = (left: Note, right: Note, sort: NoteSort): number => {
  switch (sort) {
    case NOTE_SORT.CREATED:
      return left.createdAt.localeCompare(right.createdAt)
    case NOTE_SORT.PROGRESS:
      return getNoteProgress(left) - getNoteProgress(right)
    case NOTE_SORT.TITLE:
      return compareText(left.title, right.title)
    case NOTE_SORT.UPDATED:
      return left.updatedAt.localeCompare(right.updatedAt)
  }
}

const compareTieBreakers = (left: Note, right: Note): number => (
  right.updatedAt.localeCompare(left.updatedAt)
  || left.id.localeCompare(right.id)
)

export const selectNotes = (
  notes: readonly Note[],
  state: NotesListState,
): Note[] => notes
  .filter(note => matchesSearch(note, state.query) && matchesCategories(note, state.categories))
  .sort((left, right) => {
    const criterionResult = compareByCriterion(left, right, state.sort)
    const direction = state.order === SORT_ORDER.ASC ? 1 : -1
    return criterionResult * direction || compareTieBreakers(left, right)
  })
