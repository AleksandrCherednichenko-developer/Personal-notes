import { describe, expect, it } from 'vitest'

import { PERSISTED_SCHEMA_VERSION } from '../../../app/domain'
import {
  NOTES_STORAGE_KEY,
  STORAGE_WARNING_CODE,
  createMemoryStorage,
  createNotesStorageAdapter,
  parseNotesStorageValue,
} from '../../../app/persistence/notes-storage'
import type { Note } from '../../../app/domain'
import type { StorageLike } from '../../../app/persistence/notes-storage'

const note: Note = {
  id: 'note-1',
  title: 'Планы',
  todos: [],
  categories: ['Личное'],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
}

describe('notes storage adapter', () => {
  it('parses valid external values and treats a removed key as an empty collection', () => {
    expect(parseNotesStorageValue(JSON.stringify({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [note],
    }))).toEqual({ notes: [note], warning: null })
    expect(parseNotesStorageValue(null)).toEqual({ notes: [], warning: null })
  })

  it('reports invalid external values without throwing', () => {
    expect(parseNotesStorageValue('{broken')).toEqual({
      notes: [],
      warning: { code: STORAGE_WARNING_CODE.CORRUPTED_DATA },
    })
    expect(parseNotesStorageValue(JSON.stringify({ schemaVersion: 2, notes: [] }))).toEqual({
      notes: [],
      warning: { code: STORAGE_WARNING_CODE.UNSUPPORTED_VERSION },
    })
  })

  it('loads an empty collection when storage has no value', () => {
    const adapter = createNotesStorageAdapter(() => createMemoryStorage())

    expect(adapter.load()).toEqual({ notes: [], warning: null })
  })

  it('loads and saves a valid versioned collection', () => {
    const storage = createMemoryStorage()
    const adapter = createNotesStorageAdapter(() => storage)

    expect(adapter.save([note])).toEqual({ warning: null })
    expect(JSON.parse(storage.getItem(NOTES_STORAGE_KEY) ?? '')).toEqual({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [note],
    })
    expect(adapter.load()).toEqual({ notes: [note], warning: null })
  })

  it('reports corrupted JSON without silently replacing it', () => {
    const storage = createMemoryStorage()
    storage.setItem(NOTES_STORAGE_KEY, '{broken')
    const adapter = createNotesStorageAdapter(() => storage)

    expect(adapter.load()).toEqual({
      notes: [],
      warning: { code: STORAGE_WARNING_CODE.CORRUPTED_DATA },
    })
    expect(storage.getItem(NOTES_STORAGE_KEY)).toBe('{broken')
  })

  it('distinguishes an unsupported schema version from corrupted data', () => {
    const storage = createMemoryStorage()
    storage.setItem(NOTES_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, notes: [] }))
    const adapter = createNotesStorageAdapter(() => storage)

    expect(adapter.load().warning).toEqual({
      code: STORAGE_WARNING_CODE.UNSUPPORTED_VERSION,
    })
  })

  it('reports a structurally corrupted envelope with the current version', () => {
    const storage = createMemoryStorage()
    storage.setItem(NOTES_STORAGE_KEY, JSON.stringify({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [{ id: 'broken-note' }],
    }))
    const adapter = createNotesStorageAdapter(() => storage)

    expect(adapter.load().warning).toEqual({
      code: STORAGE_WARNING_CODE.CORRUPTED_DATA,
    })
  })

  it('falls back to memory when access to storage is unavailable', () => {
    const adapter = createNotesStorageAdapter(() => {
      throw new DOMException('Access denied', 'SecurityError')
    })

    expect(adapter.load()).toEqual({
      notes: [],
      warning: { code: STORAGE_WARNING_CODE.UNAVAILABLE },
    })
    expect(adapter.save([note])).toEqual({
      warning: { code: STORAGE_WARNING_CODE.UNAVAILABLE },
    })
    expect(adapter.load()).toEqual({
      notes: [note],
      warning: { code: STORAGE_WARNING_CODE.UNAVAILABLE },
    })
  })

  it('uses memory when the storage provider returns no storage', () => {
    const adapter = createNotesStorageAdapter(() => null)

    expect(adapter.load()).toEqual({
      notes: [],
      warning: { code: STORAGE_WARNING_CODE.UNAVAILABLE },
    })
  })

  it('falls back to memory after a read error', () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new DOMException('Read denied', 'SecurityError')
      },
      removeItem: () => undefined,
      setItem: () => undefined,
    }
    const adapter = createNotesStorageAdapter(() => storage)

    expect(adapter.load().warning).toEqual({ code: STORAGE_WARNING_CODE.READ_FAILED })
    adapter.save([note])
    expect(adapter.load()).toEqual({
      notes: [note],
      warning: { code: STORAGE_WARNING_CODE.READ_FAILED },
    })
  })

  it('keeps the explicit save in memory after a quota error', () => {
    let writeAttempts = 0
    const storage: StorageLike = {
      getItem: () => null,
      removeItem: () => undefined,
      setItem: () => {
        writeAttempts += 1
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      },
    }
    const adapter = createNotesStorageAdapter(() => storage)

    expect(adapter.save([note])).toEqual({
      warning: { code: STORAGE_WARNING_CODE.WRITE_FAILED },
    })
    expect(adapter.load()).toEqual({
      notes: [note],
      warning: { code: STORAGE_WARNING_CODE.WRITE_FAILED },
    })
    expect(writeAttempts).toBe(1)
  })

})
