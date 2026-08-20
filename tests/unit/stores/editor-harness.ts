import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'

import { createEditorStore } from '../../../app/stores/editor'
import type { CreateNoteInput, Note } from '../../../app/domain'
import type {
  DraftStorageAdapter,
  NotesRepository,
  PageLifecycle,
} from '../../../app/editor/types'

export const savedNote: Note = {
  id: 'note-1',
  title: 'Сохранённая заметка',
  todos: [{ id: 'todo-1', text: 'Задача', completed: false }],
  categories: [],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
}

export const cloneNote = (note: Note): Note => structuredClone(note)

export const createNotesRepository = (): NotesRepository => {
  const notes = [cloneNote(savedNote)]

  return {
    notes,
    createNote: vi.fn((input: CreateNoteInput): Note => ({
      ...cloneNote(savedNote),
      id: 'note-new',
      title: input.title,
      todos: input.todos ?? [],
      categories: input.categories ?? [],
    })),
    deleteNote: vi.fn((noteId: string) => {
      const index = notes.findIndex(note => note.id === noteId)
      if (index >= 0) notes.splice(index, 1)
    }),
    saveNote: vi.fn((note: Note) => {
      const index = notes.findIndex(currentNote => currentNote.id === note.id)
      if (index >= 0) notes[index] = cloneNote(note)
      else notes.push(cloneNote(note))
    }),
  }
}

export const createDraftStorage = (): DraftStorageAdapter => ({
  load: vi.fn(() => ({ draft: null, warning: null })),
  remove: vi.fn(() => ({ warning: null })),
  save: vi.fn(() => ({ warning: null })),
})

export const createPageLifecycle = () => {
  let pageHideListener: (() => void) | null = null
  const lifecycle: PageLifecycle = {
    subscribePageHide: vi.fn((listener) => {
      pageHideListener = listener
      return () => {
        pageHideListener = null
      }
    }),
  }

  return {
    emitPageHide: () => pageHideListener?.(),
    hasListener: () => pageHideListener !== null,
    lifecycle,
  }
}

export const createStore = (options: {
  createTodoId?: () => string
  draftStorage?: DraftStorageAdapter
  notesRepository?: NotesRepository
  pageLifecycle?: PageLifecycle
} = {}) => {
  const draftStorage = options.draftStorage ?? createDraftStorage()
  const notesRepository = options.notesRepository ?? createNotesRepository()
  const pageLifecycle = options.pageLifecycle ?? createPageLifecycle().lifecycle
  const useStore = createEditorStore({
    createTodoId: options.createTodoId,
    draftStorage,
    getNotesRepository: () => notesRepository,
    now: () => new Date('2026-08-20T03:00:00.000Z'),
    pageLifecycle,
  })

  setActivePinia(createPinia())
  return { draftStorage, notesRepository, store: useStore() }
}
