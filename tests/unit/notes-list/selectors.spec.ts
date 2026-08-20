import { describe, expect, it } from 'vitest'

import {
  NOTE_SORT,
  SORT_ORDER,
  getNoteProgress,
  selectNotes,
} from '../../../app/notes-list'
import type { Note } from '../../../app/domain'

const createNote = (overrides: Partial<Note> & Pick<Note, 'id' | 'title'>): Note => ({
  todos: [],
  categories: [],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  ...overrides,
})

const notes: Note[] = [
  createNote({
    id: 'note-b',
    title: 'Бета',
    todos: [
      { id: 'todo-1', text: 'Купить хлеб', completed: true },
      { id: 'todo-2', text: 'Позвонить', completed: false },
    ],
    categories: ['Дом'],
    createdAt: '2026-08-18T00:00:00.000Z',
    updatedAt: '2026-08-20T03:00:00.000Z',
  }),
  createNote({
    id: 'note-a',
    title: 'Альфа',
    todos: [{ id: 'todo-3', text: 'Подготовить отчёт', completed: true }],
    categories: ['Работа', 'Важно'],
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-19T00:00:00.000Z',
  }),
  createNote({
    id: 'note-c',
    title: 'Гамма',
    categories: ['Личное'],
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-20T03:00:00.000Z',
  }),
]

const defaultState = {
  query: '',
  categories: [],
  sort: NOTE_SORT.UPDATED,
  order: SORT_ORDER.DESC,
} as const

describe('notes list selectors', () => {
  it.each([
    ['title', 'АЛЬФА', ['note-a']],
    ['Todo', 'хЛеБ', ['note-b']],
    ['category', 'важно', ['note-a']],
  ])('searches case-insensitively by %s', (_source, query, expectedIds) => {
    expect(selectNotes(notes, { ...defaultState, query }).map(note => note.id)).toEqual(
      expectedIds,
    )
  })

  it('filters multiple categories with OR semantics', () => {
    const result = selectNotes(notes, {
      ...defaultState,
      categories: ['работа', 'ЛИЧНОЕ'],
    })

    expect(result.map(note => note.id)).toEqual(['note-c', 'note-a'])
  })

  it.each([
    [NOTE_SORT.UPDATED, SORT_ORDER.DESC, ['note-b', 'note-c', 'note-a']],
    [NOTE_SORT.UPDATED, SORT_ORDER.ASC, ['note-a', 'note-b', 'note-c']],
    [NOTE_SORT.CREATED, SORT_ORDER.ASC, ['note-b', 'note-c', 'note-a']],
    [NOTE_SORT.CREATED, SORT_ORDER.DESC, ['note-a', 'note-c', 'note-b']],
    [NOTE_SORT.TITLE, SORT_ORDER.ASC, ['note-a', 'note-b', 'note-c']],
    [NOTE_SORT.TITLE, SORT_ORDER.DESC, ['note-c', 'note-b', 'note-a']],
    [NOTE_SORT.PROGRESS, SORT_ORDER.ASC, ['note-c', 'note-b', 'note-a']],
    [NOTE_SORT.PROGRESS, SORT_ORDER.DESC, ['note-a', 'note-b', 'note-c']],
  ])('sorts by %s in %s order', (sort, order, expectedIds) => {
    expect(selectNotes(notes, { ...defaultState, sort, order }).map(note => note.id)).toEqual(
      expectedIds,
    )
  })

  it('uses updatedAt and ID as deterministic tie-breakers', () => {
    const equalTitleNotes = notes.map(note => ({ ...note, title: 'Одинаково' }))

    expect(selectNotes(equalTitleNotes, {
      ...defaultState,
      sort: NOTE_SORT.TITLE,
      order: SORT_ORDER.ASC,
    }).map(note => note.id)).toEqual(['note-b', 'note-c', 'note-a'])
  })

  it('returns 0 progress for a Note without Todo', () => {
    expect(getNoteProgress(notes[2]!)).toBe(0)
  })

  it('returns an empty result when no Note matches', () => {
    expect(selectNotes(notes, { ...defaultState, query: 'нет совпадений' })).toEqual([])
  })
})
