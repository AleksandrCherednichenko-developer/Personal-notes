import { isDraftEnvelope } from '../domain'
import { isIsoDateString, isRecord } from '../domain/runtime-guards'
import { HISTORY_OPERATION_TYPE } from '../history'
import { EDITOR_SESSION_TYPE, getDraftSessionKey } from './types'
import type { DraftEnvelope, Note, Todo } from '../domain'
import type {
  HistoryOperation,
  HistorySnapshot,
  TextHistoryOperation,
} from '../history'
import type { EditorDraft } from './types'
import type { UnknownRecord } from '../domain/runtime-guards'

const isDraftTodo = (value: unknown): value is Todo => (
  isRecord(value)
  && typeof value.id === 'string'
  && value.id.trim() !== ''
  && typeof value.text === 'string'
  && typeof value.completed === 'boolean'
)

const isDraftNote = (value: unknown): value is Note => (
  isRecord(value)
  && typeof value.id === 'string'
  && value.id.trim() !== ''
  && typeof value.title === 'string'
  && Array.isArray(value.todos)
  && value.todos.every(isDraftTodo)
  && Array.isArray(value.categories)
  && value.categories.every(category => typeof category === 'string')
  && isIsoDateString(value.createdAt)
  && isIsoDateString(value.updatedAt)
)

const hasStringChange = (value: UnknownRecord): boolean => (
  typeof value.before === 'string' && typeof value.after === 'string'
)

const hasTodoIdentity = (value: UnknownRecord): boolean => (
  typeof value.todoId === 'string' && value.todoId.trim() !== ''
)

const hasCollectionIndex = (value: UnknownRecord): boolean => (
  typeof value.index === 'number'
  && Number.isInteger(value.index)
  && value.index >= 0
)

export const isHistoryOperation = (value: unknown): value is HistoryOperation => {
  if (!isRecord(value)) return false

  switch (value.type) {
    case HISTORY_OPERATION_TYPE.SET_TITLE:
      return hasStringChange(value)
    case HISTORY_OPERATION_TYPE.SET_TODO_TEXT:
      return hasTodoIdentity(value) && hasStringChange(value)
    case HISTORY_OPERATION_TYPE.SET_TODO_COMPLETED:
      return hasTodoIdentity(value)
        && typeof value.before === 'boolean'
        && typeof value.after === 'boolean'
    case HISTORY_OPERATION_TYPE.ADD_TODO:
    case HISTORY_OPERATION_TYPE.REMOVE_TODO:
      return hasCollectionIndex(value) && isDraftTodo(value.todo)
    case HISTORY_OPERATION_TYPE.ADD_CATEGORY:
    case HISTORY_OPERATION_TYPE.REMOVE_CATEGORY:
      return hasCollectionIndex(value) && typeof value.category === 'string'
    default:
      return false
  }
}

const isTextHistoryOperation = (value: unknown): value is TextHistoryOperation => (
  isHistoryOperation(value)
  && (
    value.type === HISTORY_OPERATION_TYPE.SET_TITLE
    || value.type === HISTORY_OPERATION_TYPE.SET_TODO_TEXT
  )
)

export const isHistorySnapshot = (value: unknown): value is HistorySnapshot => (
  isRecord(value)
  && Array.isArray(value.undoStack)
  && value.undoStack.every(isHistoryOperation)
  && Array.isArray(value.redoStack)
  && value.redoStack.every(isHistoryOperation)
  && (
    value.pendingTextOperation === null
    || isTextHistoryOperation(value.pendingTextOperation)
  )
)

export const isEditorDraft = (value: unknown): value is EditorDraft => {
  if (
    !isRecord(value)
    || typeof value.sessionKey !== 'string'
    || !isDraftNote(value.workingNote)
    || !isHistorySnapshot(value.history)
    || !isIsoDateString(value.savedAt)
  ) return false

  if (value.sessionType === EDITOR_SESSION_TYPE.NEW) {
    return value.sourceNoteId === null
      && value.sessionKey === getDraftSessionKey(EDITOR_SESSION_TYPE.NEW, null)
  }

  return value.sessionType === EDITOR_SESSION_TYPE.EXISTING
    && typeof value.sourceNoteId === 'string'
    && value.sourceNoteId.trim() !== ''
    && value.sessionKey === getDraftSessionKey(
      EDITOR_SESSION_TYPE.EXISTING,
      value.sourceNoteId,
    )
}

export const isEditorDraftEnvelope = (
  value: unknown,
): value is DraftEnvelope<EditorDraft> => (
  isDraftEnvelope(value, isEditorDraft)
)
