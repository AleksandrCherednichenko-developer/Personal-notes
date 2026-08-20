import { ref } from 'vue'
import { defineStore } from 'pinia'

import {
  HISTORY_OPERATION_TYPE,
  applyHistoryOperation,
  createHistoryEngine,
} from '../history'
import { EDITOR_SESSION_TYPE, getDraftSessionKey } from '../editor/types'
import { normalizeCategoryCandidate } from '../editor/categories'
import { normalizeCategories, normalizeRequiredText, validateNote } from '../domain'
import type { Note, Todo, ValidationIssue } from '../domain'
import type {
  HistoryEngine,
  HistoryOperation,
  HistorySnapshot,
  TextHistoryOperation,
} from '../history'
import type {
  EditorDraft,
  EditorSessionType,
  EditorStoreDependencies,
} from '../editor/types'
import type { StorageWarning } from '../persistence/notes-storage'

export const DRAFT_AUTOSAVE_DELAY_MS = 800

const createEmptyHistorySnapshot = (): HistorySnapshot => ({
  undoStack: [],
  redoStack: [],
  pendingTextOperation: null,
})

const cloneNote = (note: Note): Note => ({
  ...note,
  todos: note.todos.map(todo => ({ ...todo })),
  categories: [...note.categories],
})

const defaultNow = (): Date => new Date()
const defaultCreateTodoId = (): string => crypto.randomUUID()

export const createEditorStore = (
  dependencies: EditorStoreDependencies,
) => defineStore('editor', () => {
  const notesRepository = dependencies.getNotesRepository()
  const now = dependencies.now ?? defaultNow
  const createTodoId = dependencies.createTodoId ?? defaultCreateTodoId

  const workingNote = ref<Note | null>(null)
  const availableDraft = ref<EditorDraft | null>(null)
  const canUndo = ref(false)
  const canRedo = ref(false)
  const storageWarning = ref<StorageWarning | null>(null)
  const validationIssues = ref<ValidationIssue[]>([])
  const hasExternalDeletionConflict = ref(false)

  let sessionKey: string | null = null
  let sessionType: EditorSessionType | null = null
  let sourceNoteId: string | null = null
  let historySnapshot = createEmptyHistorySnapshot()
  let isDirty = false
  let hasAttemptedValidation = false
  let historyEngine: HistoryEngine | null = null
  let draftTimer: ReturnType<typeof setTimeout> | null = null
  let unsubscribePageHide: (() => void) | null = null

  const clearDraftTimer = (): void => {
    if (draftTimer === null) return
    clearTimeout(draftTimer)
    draftTimer = null
  }

  const syncHistorySnapshot = (): void => {
    historySnapshot = historyEngine?.getSnapshot() ?? createEmptyHistorySnapshot()
    canUndo.value = historySnapshot.undoStack.length > 0
      || historySnapshot.pendingTextOperation !== null
    canRedo.value = historySnapshot.redoStack.length > 0
  }

  const stopRuntime = (): void => {
    clearDraftTimer()
    historyEngine?.destroy()
    historyEngine = null
    unsubscribePageHide?.()
    unsubscribePageHide = null
  }

  const clearSessionState = (): void => {
    stopRuntime()
    workingNote.value = null
    sessionKey = null
    sessionType = null
    sourceNoteId = null
    availableDraft.value = null
    historySnapshot = createEmptyHistorySnapshot()
    canUndo.value = false
    canRedo.value = false
    validationIssues.value = []
    isDirty = false
    hasExternalDeletionConflict.value = false
    hasAttemptedValidation = false
  }

  const flushDraft = (): void => {
    clearDraftTimer()

    if (
      !isDirty
      || workingNote.value === null
      || sessionKey === null
      || sessionType === null
      || historyEngine === null
    ) return

    syncHistorySnapshot()
    const draft: EditorDraft = {
      sessionKey,
      sessionType,
      sourceNoteId,
      workingNote: cloneNote(workingNote.value),
      history: historySnapshot,
      savedAt: now().toISOString(),
    }
    storageWarning.value = dependencies.draftStorage.save(draft).warning
  }

  const scheduleDraftSave = (): void => {
    clearDraftTimer()
    draftTimer = setTimeout(flushDraft, DRAFT_AUTOSAVE_DELAY_MS)
  }

  const initializeSession = (
    note: Note,
    nextSessionType: EditorSessionType,
    nextSourceNoteId: string | null,
  ): void => {
    stopRuntime()
    const nextSessionKey = getDraftSessionKey(nextSessionType, nextSourceNoteId)
    const draftResult = dependencies.draftStorage.load(nextSessionKey)

    workingNote.value = cloneNote(note)
    sessionKey = nextSessionKey
    sessionType = nextSessionType
    sourceNoteId = nextSourceNoteId
    availableDraft.value = draftResult.draft
    storageWarning.value = draftResult.warning
    historyEngine = createHistoryEngine()
    syncHistorySnapshot()
    validationIssues.value = []
    isDirty = false
    hasAttemptedValidation = false
    unsubscribePageHide = dependencies.pageLifecycle.subscribePageHide(flushDraft)
  }

  const removeCurrentDraft = (): void => {
    if (sessionKey === null) return
    storageWarning.value = dependencies.draftStorage.remove(sessionKey).warning
  }

  const markChanged = (): void => {
    isDirty = true
    syncHistorySnapshot()

    if (hasAttemptedValidation && workingNote.value !== null) {
      validationIssues.value = validateNote(workingNote.value)
    }

    scheduleDraftSave()
  }

  const startNewSession = (): void => {
    const createdNote = notesRepository.createNote({ title: 'Новая заметка' })
    initializeSession(
      { ...cloneNote(createdNote), title: '' },
      EDITOR_SESSION_TYPE.NEW,
      null,
    )
  }

  const startExistingSession = (noteId: string): boolean => {
    const note = notesRepository.notes.find(currentNote => currentNote.id === noteId)
    if (note === undefined) {
      clearSessionState()
      return false
    }

    initializeSession(note, EDITOR_SESSION_TYPE.EXISTING, noteId)
    return true
  }

  const applyOperation = (operation: HistoryOperation): void => {
    if (workingNote.value === null || historyEngine === null) return
    workingNote.value = historyEngine.execute(workingNote.value, operation)
    markChanged()
  }

  const applyTextChange = (operation: TextHistoryOperation): void => {
    if (workingNote.value === null || historyEngine === null) return
    workingNote.value = applyHistoryOperation(workingNote.value, operation)
    historyEngine.recordTextChange(operation)
    markChanged()
  }

  const setTitle = (title: string): void => {
    if (workingNote.value === null || workingNote.value.title === title) return

    applyTextChange({
      type: HISTORY_OPERATION_TYPE.SET_TITLE,
      before: workingNote.value.title,
      after: title,
    })
  }

  const addCategory = (value: string): boolean => {
    if (workingNote.value === null) return false

    const category = normalizeCategoryCandidate(value, workingNote.value.categories)
    if (category === null) return false

    applyOperation({
      type: HISTORY_OPERATION_TYPE.ADD_CATEGORY,
      category,
      index: workingNote.value.categories.length,
    })
    return true
  }

  const removeCategory = (category: string): void => {
    const categoryIndex = workingNote.value?.categories.indexOf(category) ?? -1
    const existingCategory = workingNote.value?.categories[categoryIndex]
    if (existingCategory === undefined) return

    applyOperation({
      type: HISTORY_OPERATION_TYPE.REMOVE_CATEGORY,
      category: existingCategory,
      index: categoryIndex,
    })
  }

  const addTodo = (): string | null => {
    if (workingNote.value === null) return null

    const todo: Todo = {
      id: createTodoId(),
      text: '',
      completed: false,
    }

    applyOperation({
      type: HISTORY_OPERATION_TYPE.ADD_TODO,
      index: workingNote.value.todos.length,
      todo,
    })

    return todo.id
  }

  const setTodoText = (todoId: string, text: string): void => {
    const todo = workingNote.value?.todos.find(currentTodo => currentTodo.id === todoId)
    if (todo === undefined || todo.text === text) return

    applyTextChange({
      type: HISTORY_OPERATION_TYPE.SET_TODO_TEXT,
      todoId,
      before: todo.text,
      after: text,
    })
  }

  const setTodoCompleted = (todoId: string, completed: boolean): void => {
    const todo = workingNote.value?.todos.find(currentTodo => currentTodo.id === todoId)
    if (todo === undefined || todo.completed === completed) return

    applyOperation({
      type: HISTORY_OPERATION_TYPE.SET_TODO_COMPLETED,
      todoId,
      before: todo.completed,
      after: completed,
    })
  }

  const removeTodo = (todoId: string): void => {
    const todoIndex = workingNote.value?.todos.findIndex(todo => todo.id === todoId) ?? -1
    const todo = workingNote.value?.todos[todoIndex]
    if (todo === undefined) return

    applyOperation({
      type: HISTORY_OPERATION_TYPE.REMOVE_TODO,
      index: todoIndex,
      todo,
    })
  }

  const undo = (): void => {
    if (
      workingNote.value === null
      || historyEngine === null
      || !historyEngine.canUndo()
    ) return

    workingNote.value = historyEngine.undo(workingNote.value)
    markChanged()
  }

  const redo = (): void => {
    if (
      workingNote.value === null
      || historyEngine === null
      || !historyEngine.canRedo()
    ) return

    workingNote.value = historyEngine.redo(workingNote.value)
    markChanged()
  }

  const commitTextChange = (): void => {
    historyEngine?.flushTextTransaction()
    syncHistorySnapshot()
  }

  const restoreDraft = (): void => {
    if (availableDraft.value === null) return
    const draft = availableDraft.value
    historyEngine?.destroy()
    workingNote.value = cloneNote(draft.workingNote)
    historyEngine = createHistoryEngine(draft.history)
    availableDraft.value = null
    isDirty = true
    syncHistorySnapshot()
  }

  const discardDraft = (): void => {
    clearDraftTimer()
    removeCurrentDraft()
    availableDraft.value = null
    historyEngine?.clear()
    syncHistorySnapshot()
    isDirty = false
  }

  const normalizeAndValidateWorkingNote = (): Note | null => {
    if (workingNote.value === null) return null

    historyEngine?.flushTextTransaction()
    const normalizedNote: Note = {
      ...cloneNote(workingNote.value),
      title: normalizeRequiredText(workingNote.value.title),
      categories: normalizeCategories(workingNote.value.categories),
      todos: workingNote.value.todos.map(todo => ({
        ...todo,
        text: normalizeRequiredText(todo.text),
      })),
      updatedAt: now().toISOString(),
    }

    hasAttemptedValidation = true
    validationIssues.value = validateNote(normalizedNote)
    return validationIssues.value.length === 0 ? normalizedNote : null
  }

  const saveSession = (): Note | null => {
    if (hasExternalDeletionConflict.value) return null
    const noteToSave = normalizeAndValidateWorkingNote()
    if (noteToSave === null) return null

    notesRepository.saveNote(noteToSave)
    removeCurrentDraft()
    clearSessionState()
    return noteToSave
  }

  const cancelSession = (): void => {
    removeCurrentDraft()
    clearSessionState()
  }

  const deleteSession = (): void => {
    if (sourceNoteId !== null) {
      notesRepository.deleteNote(sourceNoteId)
    }
    removeCurrentDraft()
    clearSessionState()
  }

  const handleExternalNotes = (notes: readonly Note[]): void => {
    if (
      sessionType !== EDITOR_SESSION_TYPE.EXISTING
      || sourceNoteId === null
      || workingNote.value === null
      || hasExternalDeletionConflict.value
      || notes.some(note => note.id === sourceNoteId)
    ) return

    hasExternalDeletionConflict.value = true

    if (availableDraft.value === null) {
      isDirty = true
      flushDraft()
    }
  }

  const saveExternalDeletionConflictAsNew = (): Note | null => {
    if (!hasExternalDeletionConflict.value) return null
    const normalizedWorkingNote = normalizeAndValidateWorkingNote()
    if (normalizedWorkingNote === null) return null

    const newNote = notesRepository.createNote({
      title: normalizedWorkingNote.title,
      todos: normalizedWorkingNote.todos,
      categories: normalizedWorkingNote.categories,
    })
    notesRepository.saveNote(newNote)
    removeCurrentDraft()
    clearSessionState()
    return newNote
  }

  const exitExternalDeletionConflict = (): void => {
    if (hasExternalDeletionConflict.value) cancelSession()
  }

  return {
    availableDraft,
    canRedo,
    canUndo,
    hasExternalDeletionConflict,
    storageWarning,
    validationIssues,
    workingNote,
    addCategory,
    addTodo,
    cancelSession,
    commitTextChange,
    deleteSession,
    discardDraft,
    handleExternalNotes,
    redo,
    restoreDraft,
    removeCategory,
    saveSession,
    saveExternalDeletionConflictAsNew,
    setTitle,
    setTodoCompleted,
    setTodoText,
    startExistingSession,
    startNewSession,
    exitExternalDeletionConflict,
    removeTodo,
    undo,
  }
})
