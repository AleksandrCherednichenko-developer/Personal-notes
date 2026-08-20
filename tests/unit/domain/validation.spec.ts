import { describe, expect, it } from 'vitest'

import { VALIDATION_CODE, validateNote } from '../../../app/domain'
import type { Note } from '../../../app/domain'

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  title: 'Планы',
  todos: [],
  categories: [],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  ...overrides,
})

describe('note validation', () => {
  it('accepts a note without todos', () => {
    expect(validateNote(makeNote())).toEqual([])
  })

  it('reports an empty title', () => {
    expect(validateNote(makeNote({ title: '  ' }))).toEqual([
      { code: VALIDATION_CODE.REQUIRED, field: 'title' },
    ])
  })

  it('reports every existing todo with empty text', () => {
    const issues = validateNote(makeNote({
      todos: [
        { id: 'todo-1', text: '', completed: false },
        { id: 'todo-2', text: '  ', completed: true },
      ],
    }))

    expect(issues).toEqual([
      { code: VALIDATION_CODE.REQUIRED, field: 'todoText', todoId: 'todo-1' },
      { code: VALIDATION_CODE.REQUIRED, field: 'todoText', todoId: 'todo-2' },
    ])
  })
})
