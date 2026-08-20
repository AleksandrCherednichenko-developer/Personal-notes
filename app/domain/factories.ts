import { normalizeCategories, normalizeRequiredText } from './normalization'
import { isRequiredTextValid } from './validation'
import type {
  CreateNoteInput,
  DomainFactoryDependencies,
  Note,
  Todo,
} from './types'

const defaultCreateId = (): string => crypto.randomUUID()
const defaultNow = (): Date => new Date()

const getRequiredText = (value: string, fieldName: string): string => {
  const normalizedValue = normalizeRequiredText(value)

  if (!isRequiredTextValid(normalizedValue)) {
    throw new TypeError(`${fieldName} must not be empty`)
  }

  return normalizedValue
}

export const createTodo = (
  text: string,
  dependencies: DomainFactoryDependencies = {},
): Todo => ({
  id: (dependencies.createId ?? defaultCreateId)(),
  text: getRequiredText(text, 'Todo text'),
  completed: false,
})

export const createNote = (
  input: CreateNoteInput,
  dependencies: DomainFactoryDependencies = {},
): Note => {
  const timestamp = (dependencies.now ?? defaultNow)().toISOString()
  const todos = (input.todos ?? []).map(todo => ({
    ...todo,
    text: getRequiredText(todo.text, 'Todo text'),
  }))

  return {
    id: (dependencies.createId ?? defaultCreateId)(),
    title: getRequiredText(input.title, 'Note title'),
    todos,
    categories: normalizeCategories(input.categories ?? []),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}
