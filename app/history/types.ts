import type { Note, Todo } from '../domain'

export const HISTORY_OPERATION_TYPE = {
  ADD_CATEGORY: 'add_category',
  ADD_TODO: 'add_todo',
  REMOVE_CATEGORY: 'remove_category',
  REMOVE_TODO: 'remove_todo',
  SET_TITLE: 'set_title',
  SET_TODO_COMPLETED: 'set_todo_completed',
  SET_TODO_TEXT: 'set_todo_text',
} as const

interface TextChangePayload {
  after: string
  before: string
}

interface TodoTextChangePayload extends TextChangePayload {
  todoId: string
}

interface TodoCompletedChangePayload {
  after: boolean
  before: boolean
  todoId: string
}

interface TodoCollectionChangePayload {
  index: number
  todo: Todo
}

interface CategoryCollectionChangePayload {
  category: string
  index: number
}

interface HistoryOperationPayloadMap {
  [HISTORY_OPERATION_TYPE.ADD_CATEGORY]: CategoryCollectionChangePayload
  [HISTORY_OPERATION_TYPE.ADD_TODO]: TodoCollectionChangePayload
  [HISTORY_OPERATION_TYPE.REMOVE_CATEGORY]: CategoryCollectionChangePayload
  [HISTORY_OPERATION_TYPE.REMOVE_TODO]: TodoCollectionChangePayload
  [HISTORY_OPERATION_TYPE.SET_TITLE]: TextChangePayload
  [HISTORY_OPERATION_TYPE.SET_TODO_COMPLETED]: TodoCompletedChangePayload
  [HISTORY_OPERATION_TYPE.SET_TODO_TEXT]: TodoTextChangePayload
}

export type HistoryOperation = {
  [OperationType in keyof HistoryOperationPayloadMap]: {
    type: OperationType
  } & HistoryOperationPayloadMap[OperationType]
}[keyof HistoryOperationPayloadMap]

type TextHistoryOperationType = (typeof HISTORY_OPERATION_TYPE)[
  'SET_TITLE' | 'SET_TODO_TEXT'
]

export type TextHistoryOperation = Extract<
  HistoryOperation,
  { type: TextHistoryOperationType }
>

export interface HistorySnapshot {
  undoStack: HistoryOperation[]
  redoStack: HistoryOperation[]
  pendingTextOperation: TextHistoryOperation | null
}

export interface HistoryEngine {
  canRedo: () => boolean
  canUndo: () => boolean
  clear: () => void
  destroy: () => void
  execute: (note: Note, operation: HistoryOperation) => Note
  flushTextTransaction: () => void
  getSnapshot: () => HistorySnapshot
  record: (operation: HistoryOperation) => void
  recordTextChange: (operation: TextHistoryOperation) => void
  redo: (note: Note) => Note
  undo: (note: Note) => Note
}
