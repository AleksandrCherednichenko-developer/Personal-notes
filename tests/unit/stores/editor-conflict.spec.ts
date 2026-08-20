import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_WARNING_CODE } from '../../../app/persistence/notes-storage'
import {
  createDraftStorage,
  createNotesRepository,
  createStore,
  savedNote,
} from './editor-harness'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('editor external deletion conflict', () => {
  it('preserves the working copy and immediately stores its draft', () => {
    const draftStorage = createDraftStorage()
    const { store } = createStore({ draftStorage })
    store.startExistingSession(savedNote.id)
    store.setTitle('Несохранённое изменение')
    vi.mocked(draftStorage.save).mockClear()

    store.handleExternalNotes([])

    expect(store.hasExternalDeletionConflict).toBe(true)
    expect(store.workingNote?.title).toBe('Несохранённое изменение')
    expect(draftStorage.save).toHaveBeenCalledWith(expect.objectContaining({
      sourceNoteId: savedNote.id,
      workingNote: expect.objectContaining({ title: 'Несохранённое изменение' }),
    }))
    expect(store.saveSession()).toBeNull()
  })

  it('saves a valid conflicting copy as a new note ID and never restores the old ID', () => {
    const draftStorage = createDraftStorage()
    const notesRepository = createNotesRepository()
    const { store } = createStore({ draftStorage, notesRepository })
    store.startExistingSession(savedNote.id)
    store.setTitle('Новая копия')
    notesRepository.notes.splice(0)
    store.handleExternalNotes(notesRepository.notes)

    const result = store.saveExternalDeletionConflictAsNew()

    expect(result).toMatchObject({ id: 'note-new', title: 'Новая копия' })
    expect(result?.id).not.toBe(savedNote.id)
    expect(notesRepository.saveNote).toHaveBeenCalledWith(result)
    expect(notesRepository.notes.map(note => note.id)).toEqual(['note-new'])
    expect(draftStorage.remove).toHaveBeenCalled()
    expect(store.workingNote).toBeNull()
    expect(store.hasExternalDeletionConflict).toBe(false)
  })

  it('exits a conflict without recreating the externally deleted note', () => {
    const draftStorage = createDraftStorage()
    const notesRepository = createNotesRepository()
    const { store } = createStore({ draftStorage, notesRepository })
    store.startExistingSession(savedNote.id)
    notesRepository.notes.splice(0)
    store.handleExternalNotes([])

    store.exitExternalDeletionConflict()

    expect(notesRepository.saveNote).not.toHaveBeenCalled()
    expect(notesRepository.notes).toEqual([])
    expect(draftStorage.remove).toHaveBeenCalled()
    expect(store.workingNote).toBeNull()
  })

  it('keeps memory state usable when draft cleanup reports a storage failure', () => {
    const draftStorage = createDraftStorage()
    vi.mocked(draftStorage.remove).mockReturnValue({
      warning: { code: STORAGE_WARNING_CODE.WRITE_FAILED },
    })
    const notesRepository = createNotesRepository()
    const { store } = createStore({ draftStorage, notesRepository })
    store.startExistingSession(savedNote.id)
    notesRepository.notes.splice(0)
    store.handleExternalNotes([])

    const result = store.saveExternalDeletionConflictAsNew()

    expect(result?.id).toBe('note-new')
    expect(notesRepository.notes).toHaveLength(1)
    expect(store.storageWarning).toEqual({ code: STORAGE_WARNING_CODE.WRITE_FAILED })
  })
})
