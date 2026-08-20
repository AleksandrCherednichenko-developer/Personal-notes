import { PERSISTED_SCHEMA_VERSION } from '../domain'
import { isRecord } from '../domain/runtime-guards'
import {
  STORAGE_WARNING_CODE,
  createMemoryStorage,
} from '../persistence/notes-storage'
import { isEditorDraftEnvelope } from './draft-guards'
import type { DraftEnvelope } from '../domain'
import type {
  StorageLike,
  StorageWarning,
  StorageWarningCode,
} from '../persistence/notes-storage'
import type {
  DraftStorageAdapter,
  DraftStorageLoadResult,
  DraftStorageWriteResult,
  EditorDraft,
} from './types'

export const DRAFTS_STORAGE_KEY = 'notes-app:v1:drafts'

type StorageProvider = () => StorageLike | null

interface ResolvedStorage {
  storage: StorageLike
  warning: StorageWarning | null
}

interface DraftCollectionResult {
  drafts: EditorDraft[]
  warning: StorageWarning | null
}

const hasUnsupportedVersion = (value: unknown): boolean => (
  isRecord(value)
  && 'schemaVersion' in value
  && value.schemaVersion !== PERSISTED_SCHEMA_VERSION
)

export const createDraftStorageAdapter = (
  provideStorage: StorageProvider,
): DraftStorageAdapter => {
  const memoryStorage = createMemoryStorage()
  let resolvedStorage: ResolvedStorage | null = null

  const switchToMemory = (code: StorageWarningCode): ResolvedStorage => {
    resolvedStorage = { storage: memoryStorage, warning: { code } }
    return resolvedStorage
  }

  const resolveStorage = (): ResolvedStorage => {
    if (resolvedStorage !== null) return resolvedStorage

    try {
      const storage = provideStorage()
      if (storage === null) {
        return switchToMemory(STORAGE_WARNING_CODE.UNAVAILABLE)
      }

      resolvedStorage = { storage, warning: null }
      return resolvedStorage
    }
    catch {
      return switchToMemory(STORAGE_WARNING_CODE.UNAVAILABLE)
    }
  }

  const readDrafts = (): DraftCollectionResult => {
    let currentStorage = resolveStorage()
    let serializedEnvelope: string | null

    try {
      serializedEnvelope = currentStorage.storage.getItem(DRAFTS_STORAGE_KEY)
    }
    catch {
      currentStorage = switchToMemory(STORAGE_WARNING_CODE.READ_FAILED)
      serializedEnvelope = currentStorage.storage.getItem(DRAFTS_STORAGE_KEY)
    }

    if (serializedEnvelope === null) {
      return { drafts: [], warning: currentStorage.warning }
    }

    let parsedEnvelope: unknown
    try {
      parsedEnvelope = JSON.parse(serializedEnvelope)
    }
    catch {
      return {
        drafts: [],
        warning: { code: STORAGE_WARNING_CODE.CORRUPTED_DATA },
      }
    }

    if (!isEditorDraftEnvelope(parsedEnvelope)) {
      return {
        drafts: [],
        warning: {
          code: hasUnsupportedVersion(parsedEnvelope)
            ? STORAGE_WARNING_CODE.UNSUPPORTED_VERSION
            : STORAGE_WARNING_CODE.CORRUPTED_DATA,
        },
      }
    }

    return { drafts: parsedEnvelope.drafts, warning: currentStorage.warning }
  }

  const writeDrafts = (drafts: EditorDraft[]): DraftStorageWriteResult => {
    const envelope: DraftEnvelope<EditorDraft> = {
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      drafts,
    }
    const serializedEnvelope = JSON.stringify(envelope)
    let currentStorage = resolveStorage()

    try {
      currentStorage.storage.setItem(DRAFTS_STORAGE_KEY, serializedEnvelope)
    }
    catch {
      currentStorage = switchToMemory(STORAGE_WARNING_CODE.WRITE_FAILED)
      currentStorage.storage.setItem(DRAFTS_STORAGE_KEY, serializedEnvelope)
    }

    return { warning: currentStorage.warning }
  }

  return {
    load: (sessionKey): DraftStorageLoadResult => {
      const result = readDrafts()
      return {
        draft: result.drafts.find(draft => draft.sessionKey === sessionKey) ?? null,
        warning: result.warning,
      }
    },
    remove: (sessionKey) => {
      const result = readDrafts()
      return writeDrafts(result.drafts.filter(draft => draft.sessionKey !== sessionKey))
    },
    save: (draft) => {
      const result = readDrafts()
      const draftIndex = result.drafts.findIndex(
        currentDraft => currentDraft.sessionKey === draft.sessionKey,
      )
      const drafts = [...result.drafts]

      if (draftIndex === -1) drafts.push(draft)
      else drafts[draftIndex] = draft

      return writeDrafts(drafts)
    },
  }
}

export const createBrowserDraftStorageAdapter = (): DraftStorageAdapter => (
  createDraftStorageAdapter(() => {
    if (!('localStorage' in globalThis)) return null
    return globalThis.localStorage
  })
)
