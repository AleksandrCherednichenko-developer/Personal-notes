import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_WARNING_CODE } from '../../../app/persistence/notes-storage'
import { PERSISTED_SCHEMA_VERSION } from '../../../app/domain'
import { createNotesStore } from '../../../app/stores/notes'
import type { Note } from '../../../app/domain'
import type { NotesStorageAdapter } from '../../../app/persistence/notes-storage'

const savedNote: Note = {
  id: 'note-1',
  title: 'Сохранённая заметка',
  todos: [],
  categories: [],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
}

const createAdapterMock = (): NotesStorageAdapter => ({
  clear: vi.fn(() => ({ warning: null })),
  load: vi.fn(() => ({ notes: [], warning: null })),
  save: vi.fn(() => ({ warning: null })),
})

describe('notes store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads persisted notes and exposes storage warning state', () => {
    const adapter = createAdapterMock()
    vi.mocked(adapter.load).mockReturnValue({
      notes: [savedNote],
      warning: { code: STORAGE_WARNING_CODE.CORRUPTED_DATA },
    })
    const store = createNotesStore(adapter)()

    store.loadNotes()

    expect(store.notes).toEqual([savedNote])
    expect(store.storageWarning).toEqual({ code: STORAGE_WARNING_CODE.CORRUPTED_DATA })
    expect(store.isLoaded).toBe(true)
  })

  it('creates a note without adding or persisting it before save', () => {
    const adapter = createAdapterMock()
    const store = createNotesStore(adapter)()

    const createdNote = store.createNote({ title: '  Новая заметка  ' })

    expect(createdNote.title).toBe('Новая заметка')
    expect(store.notes).toEqual([])
    expect(adapter.save).not.toHaveBeenCalled()
  })

  it('inserts and updates a note only through explicit save', () => {
    const adapter = createAdapterMock()
    const store = createNotesStore(adapter)()

    store.saveNote(savedNote)
    const updatedNote = { ...savedNote, title: 'Обновлённая заметка' }
    store.saveNote(updatedNote)

    expect(store.notes).toEqual([updatedNote])
    expect(adapter.save).toHaveBeenNthCalledWith(1, [savedNote])
    expect(adapter.save).toHaveBeenNthCalledWith(2, [updatedNote])
  })

  it('deletes a note and persists the remaining collection', () => {
    const secondNote = { ...savedNote, id: 'note-2', title: 'Вторая заметка' }
    const adapter = createAdapterMock()
    vi.mocked(adapter.load).mockReturnValue({
      notes: [savedNote, secondNote],
      warning: null,
    })
    const store = createNotesStore(adapter)()
    store.loadNotes()

    store.deleteNote(savedNote.id)

    expect(store.notes).toEqual([secondNote])
    expect(adapter.save).toHaveBeenCalledWith([secondNote])
  })

  it('treats repeated deletion as an idempotent persisted operation', () => {
    const adapter = createAdapterMock()
    const store = createNotesStore(adapter)()
    store.saveNote(savedNote)

    store.deleteNote(savedNote.id)
    store.deleteNote(savedNote.id)

    expect(store.notes).toEqual([])
    expect(adapter.save).toHaveBeenLastCalledWith([])
  })

  it('applies a valid external collection without writing it back', () => {
    const adapter = createAdapterMock()
    const store = createNotesStore(adapter)()

    const applied = store.applyExternalStorageValue(JSON.stringify({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [savedNote],
    }))

    expect(applied).toBe(true)
    expect(store.notes).toEqual([savedNote])
    expect(store.isLoaded).toBe(true)
    expect(adapter.save).not.toHaveBeenCalled()
  })

  it('keeps the current collection when an external payload is invalid', () => {
    const adapter = createAdapterMock()
    const store = createNotesStore(adapter)()
    store.saveNote(savedNote)
    vi.mocked(adapter.save).mockClear()

    const applied = store.applyExternalStorageValue('{broken')

    expect(applied).toBe(false)
    expect(store.notes).toEqual([savedNote])
    expect(store.storageWarning).toEqual({ code: STORAGE_WARNING_CODE.CORRUPTED_DATA })
    expect(adapter.save).not.toHaveBeenCalled()
  })

  it('keeps in-memory CRUD available and exposes a write warning', () => {
    const adapter = createAdapterMock()
    vi.mocked(adapter.save).mockReturnValue({
      warning: { code: STORAGE_WARNING_CODE.WRITE_FAILED },
    })
    const store = createNotesStore(adapter)()

    store.saveNote(savedNote)

    expect(store.notes).toEqual([savedNote])
    expect(store.storageWarning).toEqual({ code: STORAGE_WARNING_CODE.WRITE_FAILED })
  })
})
