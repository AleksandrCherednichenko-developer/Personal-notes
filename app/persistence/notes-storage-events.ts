import { NOTES_STORAGE_KEY } from './notes-storage'

export { NOTES_STORAGE_KEY } from './notes-storage'

export interface NotesStorageEventTarget {
  addEventListener: (type: 'storage', listener: (event: StorageEvent) => void) => void
  removeEventListener: (type: 'storage', listener: (event: StorageEvent) => void) => void
}

export const subscribeToNotesStorageChanges = (
  target: NotesStorageEventTarget,
  listener: (serializedNotes: string | null) => void,
): (() => void) => {
  const handleStorage = (event: StorageEvent): void => {
    if (event.key === NOTES_STORAGE_KEY) listener(event.newValue)
  }

  target.addEventListener('storage', handleStorage)
  return () => target.removeEventListener('storage', handleStorage)
}
