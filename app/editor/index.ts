import { useNotesStore } from '../stores/notes'
import { createEditorStore as createEditorStoreDefinition } from '../stores/editor'
import { createBrowserDraftStorageAdapter } from './draft-storage'
import { createBrowserPageLifecycle } from './lifecycle'

export const useEditorStore = createEditorStoreDefinition({
  draftStorage: createBrowserDraftStorageAdapter(),
  getNotesRepository: () => useNotesStore(),
  pageLifecycle: createBrowserPageLifecycle(),
})
