import type { CreateNoteInput, Note } from '../domain'
import type { HistorySnapshot } from '../history'
import type { StorageWarning } from '../persistence/notes-storage'

export const EDITOR_SESSION_TYPE = {
  EXISTING: 'existing',
  NEW: 'new',
} as const

export type EditorSessionType = (
  typeof EDITOR_SESSION_TYPE
)[keyof typeof EDITOR_SESSION_TYPE]

export interface EditorDraft {
  sessionKey: string
  sessionType: EditorSessionType
  sourceNoteId: string | null
  workingNote: Note
  history: HistorySnapshot
  savedAt: string
}

export interface DraftStorageLoadResult {
  draft: EditorDraft | null
  warning: StorageWarning | null
}

export interface DraftStorageWriteResult {
  warning: StorageWarning | null
}

export interface DraftStorageAdapter {
  load: (sessionKey: string) => DraftStorageLoadResult
  remove: (sessionKey: string) => DraftStorageWriteResult
  save: (draft: EditorDraft) => DraftStorageWriteResult
}

export interface NotesRepository {
  notes: Note[]
  createNote: (input: CreateNoteInput) => Note
  deleteNote: (noteId: string) => void
  saveNote: (note: Note) => void
}

export interface PageLifecycle {
  subscribePageHide: (listener: () => void) => () => void
}

export interface EditorStoreDependencies {
  createTodoId?: (() => string) | undefined
  draftStorage: DraftStorageAdapter
  getNotesRepository: () => NotesRepository
  now?: () => Date
  pageLifecycle: PageLifecycle
}

export const getDraftSessionKey = (
  sessionType: EditorSessionType,
  sourceNoteId: string | null,
): string => {
  if (sessionType === EDITOR_SESSION_TYPE.NEW) {
    return 'new'
  }

  if (sourceNoteId === null || sourceNoteId.trim() === '') {
    throw new TypeError('Existing editor session requires a note ID')
  }

  return `note:${sourceNoteId}`
}
