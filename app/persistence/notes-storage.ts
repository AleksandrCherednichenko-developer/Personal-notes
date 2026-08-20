import {
  PERSISTED_SCHEMA_VERSION,
  isPersistedNotesEnvelope,
} from '../domain'
import { isRecord } from '../domain/runtime-guards'
import type { Note, PersistedNotesEnvelope } from '../domain'

export const NOTES_STORAGE_KEY = 'notes-app:v1:notes'

export const STORAGE_WARNING_CODE = {
  CORRUPTED_DATA: 'corrupted_data',
  READ_FAILED: 'read_failed',
  UNAVAILABLE: 'unavailable',
  UNSUPPORTED_VERSION: 'unsupported_version',
  WRITE_FAILED: 'write_failed',
} as const

export type StorageWarningCode = (
  typeof STORAGE_WARNING_CODE
)[keyof typeof STORAGE_WARNING_CODE]

export interface StorageWarning {
  code: StorageWarningCode
}

export interface NotesStorageLoadResult {
  notes: Note[]
  warning: StorageWarning | null
}

export interface NotesStorageWriteResult {
  warning: StorageWarning | null
}

export interface NotesStorageAdapter {
  load: () => NotesStorageLoadResult
  save: (notes: readonly Note[]) => NotesStorageWriteResult
}

export interface StorageLike {
  getItem: (key: string) => string | null
  removeItem: (key: string) => void
  setItem: (key: string, value: string) => void
}

type StorageProvider = () => StorageLike | null

interface ResolvedStorage {
  storage: StorageLike
  warning: StorageWarning | null
}

const isUnsupportedEnvelope = (value: unknown): boolean => (
  isRecord(value)
  && 'schemaVersion' in value
  && value.schemaVersion !== PERSISTED_SCHEMA_VERSION
)

export const parseNotesStorageValue = (
  serializedEnvelope: string | null,
): NotesStorageLoadResult => {
  if (serializedEnvelope === null) return { notes: [], warning: null }

  let parsedEnvelope: unknown

  try {
    parsedEnvelope = JSON.parse(serializedEnvelope)
  }
  catch {
    return {
      notes: [],
      warning: { code: STORAGE_WARNING_CODE.CORRUPTED_DATA },
    }
  }

  if (!isPersistedNotesEnvelope(parsedEnvelope)) {
    return {
      notes: [],
      warning: {
        code: isUnsupportedEnvelope(parsedEnvelope)
          ? STORAGE_WARNING_CODE.UNSUPPORTED_VERSION
          : STORAGE_WARNING_CODE.CORRUPTED_DATA,
      },
    }
  }

  return { notes: parsedEnvelope.notes, warning: null }
}

export const createMemoryStorage = (): StorageLike => {
  const values = new Map<string, string>()

  return {
    getItem: key => values.get(key) ?? null,
    removeItem: key => {
      values.delete(key)
    },
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

export const createNotesStorageAdapter = (
  provideStorage: StorageProvider,
): NotesStorageAdapter => {
  const memoryStorage = createMemoryStorage()
  let resolvedStorage: ResolvedStorage | null = null

  const switchToMemory = (code: StorageWarningCode): ResolvedStorage => {
    resolvedStorage = {
      storage: memoryStorage,
      warning: { code },
    }

    return resolvedStorage
  }

  const resolveStorage = (): ResolvedStorage => {
    if (resolvedStorage !== null) {
      return resolvedStorage
    }

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

  const load = (): NotesStorageLoadResult => {
    let currentStorage = resolveStorage()
    let serializedEnvelope: string | null

    try {
      serializedEnvelope = currentStorage.storage.getItem(NOTES_STORAGE_KEY)
    }
    catch {
      currentStorage = switchToMemory(STORAGE_WARNING_CODE.READ_FAILED)
      serializedEnvelope = currentStorage.storage.getItem(NOTES_STORAGE_KEY)
    }

    const result = parseNotesStorageValue(serializedEnvelope)
    return { ...result, warning: result.warning ?? currentStorage.warning }
  }

  const save = (notes: readonly Note[]): NotesStorageWriteResult => {
    const envelope: PersistedNotesEnvelope = {
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [...notes],
    }
    const serializedEnvelope = JSON.stringify(envelope)
    let currentStorage = resolveStorage()

    try {
      currentStorage.storage.setItem(NOTES_STORAGE_KEY, serializedEnvelope)
    }
    catch {
      currentStorage = switchToMemory(STORAGE_WARNING_CODE.WRITE_FAILED)
      currentStorage.storage.setItem(NOTES_STORAGE_KEY, serializedEnvelope)
    }

    return { warning: currentStorage.warning }
  }

  return { load, save }
}

export const createBrowserNotesStorageAdapter = (): NotesStorageAdapter => (
  createNotesStorageAdapter(() => {
    if (!('localStorage' in globalThis)) {
      return null
    }

    return globalThis.localStorage
  })
)
