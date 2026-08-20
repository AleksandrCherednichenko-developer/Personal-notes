import { defineStore } from 'pinia'

import { createNote as createDomainNote } from '../domain'
import {
  createBrowserNotesStorageAdapter,
  parseNotesStorageValue,
} from '../persistence/notes-storage'
import type {
  CreateNoteInput,
  DomainFactoryDependencies,
  Note,
} from '../domain'
import type {
  NotesStorageAdapter,
  StorageWarning,
} from '../persistence/notes-storage'

interface NotesStoreState {
  isLoaded: boolean
  notes: Note[]
  storageWarning: StorageWarning | null
}

export const createNotesStore = (
  storage: NotesStorageAdapter,
  factoryDependencies: DomainFactoryDependencies = {},
) => defineStore('notes', {
  state: (): NotesStoreState => ({
    isLoaded: false,
    notes: [],
    storageWarning: null,
  }),

  actions: {
    applyExternalStorageValue(serializedNotes: string | null): boolean {
      const result = parseNotesStorageValue(serializedNotes)
      this.storageWarning = result.warning

      if (result.warning !== null) return false

      this.notes = result.notes
      this.isLoaded = true
      return true
    },

    createNote(input: CreateNoteInput): Note {
      return createDomainNote(input, factoryDependencies)
    },

    deleteNote(noteId: string): void {
      const remainingNotes = this.notes.filter(note => note.id !== noteId)
      const result = storage.save(remainingNotes)

      this.notes = remainingNotes
      this.storageWarning = result.warning
    },

    loadNotes(): void {
      const result = storage.load()

      this.notes = result.notes
      this.storageWarning = result.warning
      this.isLoaded = true
    },

    saveNote(note: Note): void {
      const existingNoteIndex = this.notes.findIndex(currentNote => currentNote.id === note.id)
      const updatedNotes = [...this.notes]

      if (existingNoteIndex === -1) {
        updatedNotes.push(note)
      }
      else {
        updatedNotes[existingNoteIndex] = note
      }

      const result = storage.save(updatedNotes)

      this.notes = updatedNotes
      this.storageWarning = result.warning
    },
  },
})

export const useNotesStore = createNotesStore(createBrowserNotesStorageAdapter())
