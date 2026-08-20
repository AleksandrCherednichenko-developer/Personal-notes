import { HISTORY_OPERATION_TYPE } from './types'
import type { HistoryOperation } from './types'
import type { Note, Todo } from '../domain'

const insertAt = <TItem>(items: readonly TItem[], index: number, item: TItem): TItem[] => [
  ...items.slice(0, index),
  item,
  ...items.slice(index),
]

const removeAt = <TItem>(items: readonly TItem[], index: number): TItem[] => [
  ...items.slice(0, index),
  ...items.slice(index + 1),
]

const updateTodo = (
  todos: readonly Todo[],
  todoId: string,
  update: (todo: Todo) => Todo,
): Todo[] => todos.map(todo => todo.id === todoId ? update(todo) : todo)

const assertNever = (value: never): never => {
  throw new TypeError(`Unsupported history operation: ${JSON.stringify(value)}`)
}

export const applyHistoryOperation = (
  note: Note,
  operation: HistoryOperation,
): Note => {
  switch (operation.type) {
    case HISTORY_OPERATION_TYPE.SET_TITLE:
      return { ...note, title: operation.after }
    case HISTORY_OPERATION_TYPE.SET_TODO_TEXT:
      return {
        ...note,
        todos: updateTodo(note.todos, operation.todoId, todo => ({
          ...todo,
          text: operation.after,
        })),
      }
    case HISTORY_OPERATION_TYPE.SET_TODO_COMPLETED:
      return {
        ...note,
        todos: updateTodo(note.todos, operation.todoId, todo => ({
          ...todo,
          completed: operation.after,
        })),
      }
    case HISTORY_OPERATION_TYPE.ADD_TODO:
      return {
        ...note,
        todos: insertAt(note.todos, operation.index, { ...operation.todo }),
      }
    case HISTORY_OPERATION_TYPE.REMOVE_TODO:
      return { ...note, todos: removeAt(note.todos, operation.index) }
    case HISTORY_OPERATION_TYPE.ADD_CATEGORY:
      return {
        ...note,
        categories: insertAt(note.categories, operation.index, operation.category),
      }
    case HISTORY_OPERATION_TYPE.REMOVE_CATEGORY:
      return { ...note, categories: removeAt(note.categories, operation.index) }
    default:
      return assertNever(operation)
  }
}

export const revertHistoryOperation = (
  note: Note,
  operation: HistoryOperation,
): Note => {
  switch (operation.type) {
    case HISTORY_OPERATION_TYPE.SET_TITLE:
      return { ...note, title: operation.before }
    case HISTORY_OPERATION_TYPE.SET_TODO_TEXT:
      return {
        ...note,
        todos: updateTodo(note.todos, operation.todoId, todo => ({
          ...todo,
          text: operation.before,
        })),
      }
    case HISTORY_OPERATION_TYPE.SET_TODO_COMPLETED:
      return {
        ...note,
        todos: updateTodo(note.todos, operation.todoId, todo => ({
          ...todo,
          completed: operation.before,
        })),
      }
    case HISTORY_OPERATION_TYPE.ADD_TODO:
      return { ...note, todos: removeAt(note.todos, operation.index) }
    case HISTORY_OPERATION_TYPE.REMOVE_TODO:
      return {
        ...note,
        todos: insertAt(note.todos, operation.index, { ...operation.todo }),
      }
    case HISTORY_OPERATION_TYPE.ADD_CATEGORY:
      return { ...note, categories: removeAt(note.categories, operation.index) }
    case HISTORY_OPERATION_TYPE.REMOVE_CATEGORY:
      return {
        ...note,
        categories: insertAt(note.categories, operation.index, operation.category),
      }
    default:
      return assertNever(operation)
  }
}
