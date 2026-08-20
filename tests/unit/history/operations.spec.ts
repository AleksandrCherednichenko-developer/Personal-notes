import { describe, expect, it } from 'vitest'

import {
  HISTORY_OPERATION_TYPE,
  applyHistoryOperation,
  revertHistoryOperation,
} from '../../../app/history'
import type { HistoryOperation } from '../../../app/history'
import type { Note } from '../../../app/domain'

const originalNote: Note = {
  id: 'note-1',
  title: 'Исходное название',
  todos: [
    { id: 'todo-1', text: 'Первое дело', completed: false },
    { id: 'todo-2', text: 'Второе дело', completed: true },
  ],
  categories: ['Работа', 'Важное'],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
}

const todoToAdd = { id: 'todo-3', text: 'Третье дело', completed: false }

const cases: Array<{
  operation: HistoryOperation
  expected: Note
}> = [
  {
    operation: {
      type: HISTORY_OPERATION_TYPE.SET_TITLE,
      before: 'Исходное название',
      after: 'Новое название',
    },
    expected: { ...originalNote, title: 'Новое название' },
  },
  {
    operation: {
      type: HISTORY_OPERATION_TYPE.SET_TODO_TEXT,
      todoId: 'todo-1',
      before: 'Первое дело',
      after: 'Изменённое дело',
    },
    expected: {
      ...originalNote,
      todos: [
        { ...originalNote.todos[0]!, text: 'Изменённое дело' },
        originalNote.todos[1]!,
      ],
    },
  },
  {
    operation: {
      type: HISTORY_OPERATION_TYPE.SET_TODO_COMPLETED,
      todoId: 'todo-1',
      before: false,
      after: true,
    },
    expected: {
      ...originalNote,
      todos: [
        { ...originalNote.todos[0]!, completed: true },
        originalNote.todos[1]!,
      ],
    },
  },
  {
    operation: {
      type: HISTORY_OPERATION_TYPE.ADD_TODO,
      todo: todoToAdd,
      index: 1,
    },
    expected: {
      ...originalNote,
      todos: [originalNote.todos[0]!, todoToAdd, originalNote.todos[1]!],
    },
  },
  {
    operation: {
      type: HISTORY_OPERATION_TYPE.REMOVE_TODO,
      todo: originalNote.todos[0]!,
      index: 0,
    },
    expected: { ...originalNote, todos: [originalNote.todos[1]!] },
  },
  {
    operation: {
      type: HISTORY_OPERATION_TYPE.ADD_CATEGORY,
      category: 'Личное',
      index: 1,
    },
    expected: { ...originalNote, categories: ['Работа', 'Личное', 'Важное'] },
  },
  {
    operation: {
      type: HISTORY_OPERATION_TYPE.REMOVE_CATEGORY,
      category: 'Работа',
      index: 0,
    },
    expected: { ...originalNote, categories: ['Важное'] },
  },
]

describe('history operations', () => {
  it.each(cases)('applies and reverts $operation.type', ({ operation, expected }) => {
    const appliedNote = applyHistoryOperation(originalNote, operation)

    expect(appliedNote).toEqual(expected)
    expect(revertHistoryOperation(appliedNote, operation)).toEqual(originalNote)
  })

  it('does not mutate the source note', () => {
    const operation = cases[3]!.operation
    const snapshotBeforeApply = structuredClone(originalNote)

    applyHistoryOperation(originalNote, operation)

    expect(originalNote).toEqual(snapshotBeforeApply)
  })
})
