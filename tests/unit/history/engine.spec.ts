import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  HISTORY_OPERATION_TYPE,
  TEXT_TRANSACTION_COMMIT_DELAY_MS,
  createHistoryEngine,
} from '../../../app/history'
import type { HistoryOperation, HistorySnapshot } from '../../../app/history'
import type { Note } from '../../../app/domain'

const makeNote = (): Note => ({
  id: 'note-1',
  title: 'Название',
  todos: [{ id: 'todo-1', text: 'Задача', completed: false }],
  categories: [],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
})

const titleOperation = (before: string, after: string): HistoryOperation => ({
  type: HISTORY_OPERATION_TYPE.SET_TITLE,
  before,
  after,
})

afterEach(() => {
  vi.useRealTimers()
})

describe('history engine', () => {
  it('supports a mixed undo and redo sequence', () => {
    const engine = createHistoryEngine()
    let note = makeNote()

    note = engine.execute(note, titleOperation('Название', 'Планы'))
    note = engine.execute(note, {
      type: HISTORY_OPERATION_TYPE.SET_TODO_COMPLETED,
      todoId: 'todo-1',
      before: false,
      after: true,
    })
    note = engine.execute(note, {
      type: HISTORY_OPERATION_TYPE.ADD_CATEGORY,
      category: 'Работа',
      index: 0,
    })

    note = engine.undo(note)
    note = engine.undo(note)
    expect(note).toMatchObject({ title: 'Планы', categories: [] })
    expect(note.todos[0]?.completed).toBe(false)

    note = engine.redo(note)
    expect(note.todos[0]?.completed).toBe(true)
    expect(engine.canUndo()).toBe(true)
    expect(engine.canRedo()).toBe(true)
  })

  it('clears redo after a new operation', () => {
    const engine = createHistoryEngine()
    let note = engine.execute(makeNote(), titleOperation('Название', 'Планы'))
    note = engine.undo(note)

    engine.execute(note, {
      type: HISTORY_OPERATION_TYPE.ADD_CATEGORY,
      category: 'Личное',
      index: 0,
    })

    expect(engine.canRedo()).toBe(false)
  })

  it('returns the current note when there is nothing to undo or redo', () => {
    const engine = createHistoryEngine()
    const note = makeNote()

    expect(engine.undo(note)).toBe(note)
    expect(engine.redo(note)).toBe(note)
  })

  it('keeps only the latest 50 undo operations', () => {
    const engine = createHistoryEngine()

    for (let index = 0; index < 55; index += 1) {
      engine.record(titleOperation(String(index), String(index + 1)))
    }

    const snapshot = engine.getSnapshot()
    expect(snapshot.undoStack).toHaveLength(50)
    expect(snapshot.undoStack[0]).toEqual(titleOperation('5', '6'))
  })

  it('serializes and restores undo/redo behavior without full Note snapshots', () => {
    const engine = createHistoryEngine()
    let note = engine.execute(makeNote(), titleOperation('Название', 'Планы'))
    note = engine.execute(note, {
      type: HISTORY_OPERATION_TYPE.ADD_CATEGORY,
      category: 'Работа',
      index: 0,
    })
    note = engine.undo(note)

    const serializedSnapshot = JSON.stringify(engine.getSnapshot())
    const restoredSnapshot = JSON.parse(serializedSnapshot) as HistorySnapshot
    const restoredEngine = createHistoryEngine(restoredSnapshot)

    expect(serializedSnapshot).not.toContain('createdAt')
    expect(serializedSnapshot).not.toContain('updatedAt')
    const redoneNote = restoredEngine.redo(note)
    const categoryUndoneNote = restoredEngine.undo(redoneNote)
    const titleUndoneNote = restoredEngine.undo(categoryUndoneNote)
    expect(redoneNote.categories).toEqual(['Работа'])
    expect(titleUndoneNote.title).toBe('Название')
  })

  it('groups continuous title input and commits it after one second', () => {
    vi.useFakeTimers()
    const engine = createHistoryEngine()

    engine.recordTextChange(titleOperation('Название', 'П'))
    vi.advanceTimersByTime(600)
    engine.recordTextChange(titleOperation('П', 'Пла'))
    vi.advanceTimersByTime(600)
    engine.recordTextChange(titleOperation('Пла', 'Планы'))

    expect(engine.getSnapshot().undoStack).toEqual([])
    vi.advanceTimersByTime(TEXT_TRANSACTION_COMMIT_DELAY_MS - 1)
    expect(engine.canUndo()).toBe(true)
    expect(engine.getSnapshot().undoStack).toEqual([])
    vi.advanceTimersByTime(1)

    expect(engine.getSnapshot().undoStack).toEqual([
      titleOperation('Название', 'Планы'),
    ])
  })

  it('starts a new text operation after the pause', () => {
    vi.useFakeTimers()
    const engine = createHistoryEngine()

    engine.recordTextChange(titleOperation('Название', 'Планы'))
    vi.advanceTimersByTime(TEXT_TRANSACTION_COMMIT_DELAY_MS)
    engine.recordTextChange(titleOperation('Планы', 'Планы на день'))
    vi.advanceTimersByTime(TEXT_TRANSACTION_COMMIT_DELAY_MS)

    expect(engine.getSnapshot().undoStack).toEqual([
      titleOperation('Название', 'Планы'),
      titleOperation('Планы', 'Планы на день'),
    ])
  })

  it('commits pending text immediately on blur', () => {
    vi.useFakeTimers()
    const engine = createHistoryEngine()

    engine.recordTextChange({
      type: HISTORY_OPERATION_TYPE.SET_TODO_TEXT,
      todoId: 'todo-1',
      before: 'Задача',
      after: 'Новая задача',
    })
    engine.flushTextTransaction()

    expect(engine.getSnapshot().undoStack).toHaveLength(1)
    vi.advanceTimersByTime(TEXT_TRANSACTION_COMMIT_DELAY_MS)
    expect(engine.getSnapshot().undoStack).toHaveLength(1)
  })

  it('groups continuous input for the same todo', () => {
    vi.useFakeTimers()
    const engine = createHistoryEngine()

    engine.recordTextChange({
      type: HISTORY_OPERATION_TYPE.SET_TODO_TEXT,
      todoId: 'todo-1',
      before: 'Задача',
      after: 'Новая',
    })
    engine.recordTextChange({
      type: HISTORY_OPERATION_TYPE.SET_TODO_TEXT,
      todoId: 'todo-1',
      before: 'Новая',
      after: 'Новая задача',
    })
    engine.flushTextTransaction()

    expect(engine.getSnapshot().undoStack).toEqual([{
      type: HISTORY_OPERATION_TYPE.SET_TODO_TEXT,
      todoId: 'todo-1',
      before: 'Задача',
      after: 'Новая задача',
    }])
  })

  it('does not commit a text transaction that returns to its initial value', () => {
    vi.useFakeTimers()
    const engine = createHistoryEngine()

    engine.recordTextChange(titleOperation('Название', 'Планы'))
    engine.recordTextChange(titleOperation('Планы', 'Название'))
    engine.flushTextTransaction()
    engine.recordTextChange(titleOperation('Название', 'Название'))

    expect(engine.canUndo()).toBe(false)
    expect(engine.getSnapshot().pendingTextOperation).toBeNull()
  })

  it('flushes the previous transaction when the edited target changes', () => {
    vi.useFakeTimers()
    const engine = createHistoryEngine()

    engine.recordTextChange(titleOperation('Название', 'Планы'))
    engine.recordTextChange({
      type: HISTORY_OPERATION_TYPE.SET_TODO_TEXT,
      todoId: 'todo-1',
      before: 'Задача',
      after: 'Другая задача',
    })

    expect(engine.getSnapshot().undoStack).toEqual([
      titleOperation('Название', 'Планы'),
    ])
    expect(engine.getSnapshot().pendingTextOperation).toMatchObject({
      type: HISTORY_OPERATION_TYPE.SET_TODO_TEXT,
      todoId: 'todo-1',
    })
  })

  it('restores and commits a JSON-serialized pending text operation', () => {
    vi.useFakeTimers()
    const engine = createHistoryEngine()
    engine.recordTextChange(titleOperation('Название', 'Планы'))
    const restoredSnapshot = JSON.parse(
      JSON.stringify(engine.getSnapshot()),
    ) as HistorySnapshot
    engine.destroy()

    const restoredEngine = createHistoryEngine(restoredSnapshot)
    vi.advanceTimersByTime(TEXT_TRANSACTION_COMMIT_DELAY_MS)

    expect(restoredEngine.undo({ ...makeNote(), title: 'Планы' }).title).toBe('Название')
  })

  it('returns isolated snapshots for Todo collection operations', () => {
    const engine = createHistoryEngine()
    const todo = { id: 'todo-2', text: 'Добавленная задача', completed: false }
    engine.record({
      type: HISTORY_OPERATION_TYPE.ADD_TODO,
      todo,
      index: 1,
    })

    const snapshot = engine.getSnapshot()
    const operation = snapshot.undoStack[0]
    todo.text = 'Изменено снаружи'

    expect(operation).toMatchObject({
      type: HISTORY_OPERATION_TYPE.ADD_TODO,
      todo: { text: 'Добавленная задача' },
    })
  })

  it('clears stacks, pending text and its timer', () => {
    vi.useFakeTimers()
    const engine = createHistoryEngine()
    engine.record(titleOperation('Первое', 'Второе'))
    engine.recordTextChange(titleOperation('Второе', 'Третье'))

    engine.clear()
    vi.advanceTimersByTime(TEXT_TRANSACTION_COMMIT_DELAY_MS)

    expect(engine.canUndo()).toBe(false)
    expect(engine.canRedo()).toBe(false)
    expect(engine.getSnapshot()).toEqual({
      undoStack: [],
      redoStack: [],
      pendingTextOperation: null,
    })
  })

  it('clears redo as soon as a text change starts', () => {
    vi.useFakeTimers()
    const engine = createHistoryEngine()
    const note = engine.execute(makeNote(), titleOperation('Название', 'Планы'))
    engine.undo(note)

    engine.recordTextChange(titleOperation('Название', 'Новый текст'))

    expect(engine.canRedo()).toBe(false)
  })
})
