import { onBeforeUnmount, onMounted } from 'vue'

import { subscribeToNotesStorageChanges } from '../persistence/notes-storage-events'
import { useNotesStore } from '../stores/notes'
import type { Note } from '../domain'

export const useNotesStorageSync = (
  onValidChange?: (notes: readonly Note[]) => void,
): void => {
  const notesStore = useNotesStore()
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = subscribeToNotesStorageChanges(window, (serializedNotes) => {
      if (notesStore.applyExternalStorageValue(serializedNotes)) {
        onValidChange?.(notesStore.notes)
      }
    })
  })

  onBeforeUnmount(() => {
    unsubscribe?.()
    unsubscribe = null
  })
}
