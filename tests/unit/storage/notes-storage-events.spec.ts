import { describe, expect, it, vi } from 'vitest'

import {
  NOTES_STORAGE_KEY,
  subscribeToNotesStorageChanges,
} from '../../../app/persistence/notes-storage-events'

describe('notes storage events', () => {
  it('forwards only persisted-notes changes and unsubscribes cleanly', () => {
    let storageListener: ((event: StorageEvent) => void) | null = null
    const eventTarget = {
      addEventListener: vi.fn((_type: 'storage', listener: (event: StorageEvent) => void) => {
        storageListener = listener
      }),
      removeEventListener: vi.fn(),
    }
    const listener = vi.fn()
    const unsubscribe = subscribeToNotesStorageChanges(eventTarget, listener)

    storageListener?.({ key: 'unrelated', newValue: 'ignored' } as StorageEvent)
    storageListener?.({ key: NOTES_STORAGE_KEY, newValue: '{"schemaVersion":1,"notes":[]}' } as StorageEvent)

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith('{"schemaVersion":1,"notes":[]}')

    unsubscribe()
    expect(eventTarget.removeEventListener).toHaveBeenCalledWith('storage', storageListener)
  })
})
