export { createNote, createTodo } from './factories'
export { isDraftEnvelope, isNote, isPersistedNotesEnvelope, isTodo } from './guards'
export { normalizeCategories, normalizeRequiredText } from './normalization'
export { PERSISTED_SCHEMA_VERSION } from './types'
export { VALIDATION_CODE, VALIDATION_FIELD, isRequiredTextValid, validateNote } from './validation'
export type {
  Category,
  CreateNoteInput,
  DomainFactoryDependencies,
  DraftEnvelope,
  Note,
  PersistedNotesEnvelope,
  PersistedSchemaVersion,
  Todo,
} from './types'
export type {
  ValidationCode,
  ValidationField,
  ValidationIssue,
} from './validation'
