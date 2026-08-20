import { applyHistoryOperation, revertHistoryOperation } from './operations'
import { HISTORY_OPERATION_TYPE } from './types'
import type {
  HistoryEngine,
  HistoryOperation,
  HistorySnapshot,
  TextHistoryOperation,
} from './types'

export const HISTORY_UNDO_LIMIT = 50
export const TEXT_TRANSACTION_COMMIT_DELAY_MS = 1_000

const cloneOperation = (operation: HistoryOperation): HistoryOperation => {
  switch (operation.type) {
    case HISTORY_OPERATION_TYPE.ADD_TODO:
    case HISTORY_OPERATION_TYPE.REMOVE_TODO:
      return { ...operation, todo: { ...operation.todo } }
    default:
      return { ...operation }
  }
}

const cloneTextOperation = (
  operation: TextHistoryOperation,
): TextHistoryOperation => ({ ...operation })

const isSameTextTarget = (
  current: TextHistoryOperation,
  next: TextHistoryOperation,
): boolean => {
  if (current.type !== next.type) {
    return false
  }

  if (current.type === HISTORY_OPERATION_TYPE.SET_TITLE) {
    return true
  }

  return next.type === HISTORY_OPERATION_TYPE.SET_TODO_TEXT
    && current.todoId === next.todoId
}

const mergeTextOperation = (
  current: TextHistoryOperation,
  next: TextHistoryOperation,
): TextHistoryOperation => {
  if (
    current.type === HISTORY_OPERATION_TYPE.SET_TITLE
    && next.type === HISTORY_OPERATION_TYPE.SET_TITLE
  ) {
    return { ...current, after: next.after }
  }

  if (
    current.type === HISTORY_OPERATION_TYPE.SET_TODO_TEXT
    && next.type === HISTORY_OPERATION_TYPE.SET_TODO_TEXT
    && current.todoId === next.todoId
  ) {
    return { ...current, after: next.after }
  }

  return cloneTextOperation(next)
}

const isTextOperationEmpty = (operation: TextHistoryOperation): boolean => (
  operation.before === operation.after
)

const createEmptySnapshot = (): HistorySnapshot => ({
  undoStack: [],
  redoStack: [],
  pendingTextOperation: null,
})

export const createHistoryEngine = (
  initialSnapshot: HistorySnapshot = createEmptySnapshot(),
): HistoryEngine => {
  let undoStack = initialSnapshot.undoStack
    .slice(-HISTORY_UNDO_LIMIT)
    .map(cloneOperation)
  let redoStack = initialSnapshot.redoStack.map(cloneOperation)
  let pendingTextOperation = initialSnapshot.pendingTextOperation === null
    ? null
    : cloneTextOperation(initialSnapshot.pendingTextOperation)
  let commitTimer: ReturnType<typeof setTimeout> | null = null

  const clearCommitTimer = (): void => {
    if (commitTimer === null) {
      return
    }

    clearTimeout(commitTimer)
    commitTimer = null
  }

  const pushOperation = (operation: HistoryOperation): void => {
    undoStack = [...undoStack, cloneOperation(operation)].slice(-HISTORY_UNDO_LIMIT)
    redoStack = []
  }

  const flushTextTransaction = (): void => {
    clearCommitTimer()

    if (pendingTextOperation === null) {
      return
    }

    const operationToCommit = pendingTextOperation
    pendingTextOperation = null

    if (!isTextOperationEmpty(operationToCommit)) {
      pushOperation(operationToCommit)
    }
  }

  const scheduleTextCommit = (): void => {
    clearCommitTimer()
    commitTimer = setTimeout(flushTextTransaction, TEXT_TRANSACTION_COMMIT_DELAY_MS)
  }

  const record = (operation: HistoryOperation): void => {
    flushTextTransaction()
    pushOperation(operation)
  }

  const recordTextChange = (operation: TextHistoryOperation): void => {
    if (pendingTextOperation !== null && isSameTextTarget(pendingTextOperation, operation)) {
      pendingTextOperation = mergeTextOperation(pendingTextOperation, operation)
      scheduleTextCommit()
      return
    }

    flushTextTransaction()

    if (isTextOperationEmpty(operation)) {
      return
    }

    pendingTextOperation = cloneTextOperation(operation)
    redoStack = []
    scheduleTextCommit()
  }

  if (pendingTextOperation !== null) {
    scheduleTextCommit()
  }

  return {
    canRedo: () => redoStack.length > 0,
    canUndo: () => undoStack.length > 0 || pendingTextOperation !== null,
    clear: () => {
      clearCommitTimer()
      undoStack = []
      redoStack = []
      pendingTextOperation = null
    },
    destroy: clearCommitTimer,
    execute: (note, operation) => {
      record(operation)
      return applyHistoryOperation(note, operation)
    },
    flushTextTransaction,
    getSnapshot: () => ({
      undoStack: undoStack.map(cloneOperation),
      redoStack: redoStack.map(cloneOperation),
      pendingTextOperation: pendingTextOperation === null
        ? null
        : cloneTextOperation(pendingTextOperation),
    }),
    record,
    recordTextChange,
    redo: (note) => {
      flushTextTransaction()
      const operation = redoStack.pop()

      if (operation === undefined) {
        return note
      }

      undoStack.push(operation)
      return applyHistoryOperation(note, operation)
    },
    undo: (note) => {
      flushTextTransaction()
      const operation = undoStack.pop()

      if (operation === undefined) {
        return note
      }

      redoStack.push(operation)
      return revertHistoryOperation(note, operation)
    },
  }
}
