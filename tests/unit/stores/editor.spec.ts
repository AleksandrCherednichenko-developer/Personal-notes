import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { VALIDATION_CODE, VALIDATION_FIELD } from '../../../app/domain'
import {
  createDraftStorage,
  createNotesRepository,
  createPageLifecycle,
  createStore,
  savedNote,
} from './editor-harness'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('editor store sessions', () => {
  it('keeps session and history implementation details private', () => {
    const { store } = createStore()

    expect(store).not.toHaveProperty('historySnapshot')
    expect(store).not.toHaveProperty('isDirty')
    expect(store).not.toHaveProperty('sessionKey')
    expect(store).not.toHaveProperty('sessionType')
    expect(store).not.toHaveProperty('sourceNoteId')
  })

  it('starts a blank new session', () => {
    const { store } = createStore()

    store.startNewSession()

    expect(store.workingNote).toMatchObject({ id: 'note-new', title: '' })
    expect(store.canUndo).toBe(false)
  })

  it('starts an existing session with an isolated working copy', () => {
    const notesRepository = createNotesRepository()
    const { store } = createStore({ notesRepository })

    expect(store.startExistingSession(savedNote.id)).toBe(true)
    store.setTitle('Изменённый черновик')

    expect(store.workingNote?.title).toBe('Изменённый черновик')
    expect(notesRepository.notes[0]?.title).toBe(savedNote.title)
    expect(notesRepository.saveNote).not.toHaveBeenCalled()
  })

  it('returns false for an unknown existing note', () => {
    const { store } = createStore()

    expect(store.startExistingSession('missing')).toBe(false)
    expect(store.workingNote).toBeNull()
  })

  it('clears stale editor state when a reused route receives an unknown ID', () => {
    const { store } = createStore()
    store.startExistingSession(savedNote.id)

    expect(store.startExistingSession('missing')).toBe(false)
    expect(store.workingNote).toBeNull()
  })
})

describe('editor session completion', () => {
  it('does not persist an unchanged session after no-op undo and redo', () => {
    const draftStorage = createDraftStorage()
    const pageLifecycle = createPageLifecycle()
    const { store } = createStore({
      draftStorage,
      pageLifecycle: pageLifecycle.lifecycle,
    })
    store.startExistingSession(savedNote.id)

    store.undo()
    store.redo()
    pageLifecycle.emitPageHide()

    expect(draftStorage.save).not.toHaveBeenCalled()
    expect(store.workingNote).toEqual(savedNote)
  })

  it('adds and removes normalized categories as atomic undoable operations', () => {
    const { store } = createStore()
    store.startExistingSession(savedNote.id)

    expect(store.addCategory('  Работа  ')).toBe(true)
    expect(store.addCategory('работа')).toBe(false)
    expect(store.addCategory('   ')).toBe(false)
    expect(store.workingNote?.categories).toEqual(['Работа'])
    expect(store.canUndo).toBe(true)

    store.undo()
    expect(store.workingNote?.categories).toEqual([])
    store.redo()
    expect(store.workingNote?.categories).toEqual(['Работа'])

    store.removeCategory('Работа')
    expect(store.workingNote?.categories).toEqual([])

    store.undo()
    expect(store.workingNote?.categories).toEqual(['Работа'])
  })

  it('includes categories in the draft and persisted note', () => {
    const draftStorage = createDraftStorage()
    const notesRepository = createNotesRepository()
    const { store } = createStore({ draftStorage, notesRepository })
    store.startNewSession()
    store.setTitle('Планы')
    store.addCategory('Работа')

    vi.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS)
    expect(draftStorage.save).toHaveBeenCalledWith(expect.objectContaining({
      workingNote: expect.objectContaining({ categories: ['Работа'] }),
    }))

    const result = store.saveSession()
    expect(result?.categories).toEqual(['Работа'])
    expect(notesRepository.saveNote).toHaveBeenCalledWith(result)
  })

  it('edits title and Todo fields through editor actions', () => {
    const { store } = createStore({ createTodoId: () => 'todo-new' })
    store.startExistingSession(savedNote.id)

    store.setTitle('Новое название')
    const todoId = store.addTodo()
    store.setTodoText('todo-new', 'Новая задача')
    store.setTodoCompleted('todo-new', true)

    expect(todoId).toBe('todo-new')
    expect(store.workingNote).toMatchObject({
      title: 'Новое название',
      todos: [
        savedNote.todos[0],
        { id: 'todo-new', text: 'Новая задача', completed: true },
      ],
    })

    store.removeTodo('todo-new')
    expect(store.workingNote?.todos).toEqual(savedNote.todos)
  })

  it('rejects an empty title and clears its inline error after correction', () => {
    const notesRepository = createNotesRepository()
    const { store } = createStore({ notesRepository })
    store.startNewSession()

    expect(store.saveSession()).toBeNull()
    expect(store.validationIssues).toEqual([
      { code: VALIDATION_CODE.REQUIRED, field: VALIDATION_FIELD.TITLE },
    ])
    expect(notesRepository.saveNote).not.toHaveBeenCalled()

    store.setTitle('Исправленное название')
    expect(store.validationIssues).toEqual([])
  })

  it('rejects every existing Todo with empty text', () => {
    const notesRepository = createNotesRepository()
    const { store } = createStore({
      createTodoId: () => 'todo-empty',
      notesRepository,
    })
    store.startNewSession()
    store.setTitle('Планы')
    store.addTodo()

    expect(store.saveSession()).toBeNull()
    expect(store.validationIssues).toEqual([{
      code: VALIDATION_CODE.REQUIRED,
      field: VALIDATION_FIELD.TODO_TEXT,
      todoId: 'todo-empty',
    }])
    expect(notesRepository.saveNote).not.toHaveBeenCalled()
  })

  it('saves a note without Todo and trims all persisted text', () => {
    const notesRepository = createNotesRepository()
    const { store } = createStore({ notesRepository })
    store.startNewSession()
    store.setTitle('  Покупки  ')

    const result = store.saveSession()

    expect(result).toMatchObject({ title: 'Покупки', todos: [] })
    expect(notesRepository.saveNote).toHaveBeenCalledWith(result)
  })

  it('trims Todo text before persistence', () => {
    const notesRepository = createNotesRepository()
    const { store } = createStore({
      createTodoId: () => 'todo-new',
      notesRepository,
    })
    store.startNewSession()
    store.setTitle('Покупки')
    store.addTodo()
    store.setTodoText('todo-new', '  Купить молоко  ')

    const result = store.saveSession()

    expect(result?.todos).toEqual([
      { id: 'todo-new', text: 'Купить молоко', completed: false },
    ])
  })

  it('saves the working copy and clears draft, history and session state', () => {
    const draftStorage = createDraftStorage()
    const notesRepository = createNotesRepository()
    const { store } = createStore({ draftStorage, notesRepository })
    store.startExistingSession(savedNote.id)
    store.setTitle('Сохранённое изменение')

    const result = store.saveSession()

    expect(result).toMatchObject({
      title: 'Сохранённое изменение',
      updatedAt: '2026-08-20T03:00:00.000Z',
    })
    expect(notesRepository.saveNote).toHaveBeenCalledWith(result)
    expect(draftStorage.remove).toHaveBeenCalled()
    expect(store.workingNote).toBeNull()
    expect(store.canUndo).toBe(false)
  })

  it('cancels without changing persisted notes and removes the draft', () => {
    const draftStorage = createDraftStorage()
    const notesRepository = createNotesRepository()
    const { store } = createStore({ draftStorage, notesRepository })
    store.startExistingSession(savedNote.id)
    store.setTitle('Несохранённое изменение')

    store.cancelSession()

    expect(notesRepository.notes[0]?.title).toBe(savedNote.title)
    expect(notesRepository.saveNote).not.toHaveBeenCalled()
    expect(draftStorage.remove).toHaveBeenCalled()
    expect(store.workingNote).toBeNull()
  })

  it('deletes an existing note and clears the editor session', () => {
    const draftStorage = createDraftStorage()
    const notesRepository = createNotesRepository()
    const { store } = createStore({ draftStorage, notesRepository })
    store.startExistingSession(savedNote.id)

    store.deleteSession()

    expect(notesRepository.deleteNote).toHaveBeenCalledWith(savedNote.id)
    expect(draftStorage.remove).toHaveBeenCalled()
    expect(store.workingNote).toBeNull()
  })

  it('does not delete persisted notes when abandoning a new session', () => {
    const notesRepository = createNotesRepository()
    const { store } = createStore({ notesRepository })
    store.startNewSession()

    store.deleteSession()

    expect(notesRepository.deleteNote).not.toHaveBeenCalled()
    expect(store.workingNote).toBeNull()
  })

  it('supports redo through the restored working copy', () => {
    const { store } = createStore()
    store.startExistingSession(savedNote.id)
    store.addCategory('Работа')
    store.undo()

    expect(store.canRedo).toBe(true)
    store.redo()

    expect(store.workingNote?.categories).toEqual(['Работа'])
    expect(store.canRedo).toBe(false)
  })

  it('commits a pending text transaction explicitly on blur', () => {
    const { store } = createStore()
    store.startExistingSession(savedNote.id)
    store.setTitle('Изменённое название')

    expect(store.canUndo).toBe(true)

    store.commitTextChange()

    store.undo()
    expect(store.workingNote?.title).toBe(savedNote.title)
  })

  it('resets both history stacks after cancel and delete', () => {
    const { store } = createStore()
    store.startExistingSession(savedNote.id)
    store.setTitle('Перед отменой')
    store.commitTextChange()
    store.undo()

    expect(store.canRedo).toBe(true)
    store.cancelSession()
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)

    store.startExistingSession(savedNote.id)
    store.setTitle('Перед удалением')
    store.deleteSession()
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)
  })

  it('safely ignores editing actions without an active session', () => {
    const { draftStorage, notesRepository, store } = createStore()

    expect(store.addCategory('Работа')).toBe(false)
    store.setTitle('Текст')
    expect(store.addTodo()).toBeNull()
    store.removeCategory('Работа')
    store.removeTodo('missing')
    store.setTodoCompleted('missing', true)
    store.setTodoText('missing', 'Текст')
    store.undo()
    store.redo()
    store.restoreDraft()
    store.discardDraft()

    expect(store.saveSession()).toBeNull()
    expect(draftStorage.save).not.toHaveBeenCalled()
    expect(notesRepository.saveNote).not.toHaveBeenCalled()
  })
})
