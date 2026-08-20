export const PERSISTED_SCHEMA_VERSION = 1 as const

export type PersistedSchemaVersion = typeof PERSISTED_SCHEMA_VERSION
export type Category = string

export interface Todo {
  id: string
  text: string
  completed: boolean
}

export interface Note {
  id: string
  title: string
  todos: Todo[]
  categories: Category[]
  createdAt: string
  updatedAt: string
}

export interface PersistedNotesEnvelope {
  schemaVersion: PersistedSchemaVersion
  notes: Note[]
}

export interface DraftEnvelope<TDraft = unknown> {
  schemaVersion: PersistedSchemaVersion
  drafts: TDraft[]
}

export interface CreateNoteInput {
  title: string
  todos?: Todo[]
  categories?: Category[]
}

export interface DomainFactoryDependencies {
  createId?: () => string
  now?: () => Date
}
