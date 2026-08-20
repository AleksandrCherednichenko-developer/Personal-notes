import type { Note } from './types'

export const VALIDATION_CODE = {
  REQUIRED: 'required',
} as const

export const VALIDATION_FIELD = {
  TITLE: 'title',
  TODO_TEXT: 'todoText',
} as const

export type ValidationCode = (typeof VALIDATION_CODE)[keyof typeof VALIDATION_CODE]
export type ValidationField = (typeof VALIDATION_FIELD)[keyof typeof VALIDATION_FIELD]

export interface ValidationIssue {
  code: ValidationCode
  field: ValidationField
  todoId?: string
}

export const isRequiredTextValid = (value: string): boolean => value.trim() !== ''

export const validateNote = (note: Note): ValidationIssue[] => {
  const issues: ValidationIssue[] = []

  if (!isRequiredTextValid(note.title)) {
    issues.push({
      code: VALIDATION_CODE.REQUIRED,
      field: VALIDATION_FIELD.TITLE,
    })
  }

  for (const todo of note.todos) {
    if (!isRequiredTextValid(todo.text)) {
      issues.push({
        code: VALIDATION_CODE.REQUIRED,
        field: VALIDATION_FIELD.TODO_TEXT,
        todoId: todo.id,
      })
    }
  }

  return issues
}
