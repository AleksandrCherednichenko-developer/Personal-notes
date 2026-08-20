import { describe, expect, it } from 'vitest'

import { PERSISTED_SCHEMA_VERSION } from '../../../app/domain'
import { HISTORY_OPERATION_TYPE } from '../../../app/history'
import { createMemoryStorage, STORAGE_WARNING_CODE } from '../../../app/persistence/notes-storage'
import {
  DRAFTS_STORAGE_KEY,
  createDraftStorageAdapter,
} from '../../../app/editor/draft-storage'
import { isEditorDraft } from '../../../app/editor/draft-guards'
import { EDITOR_SESSION_TYPE, getDraftSessionKey } from '../../../app/editor/types'
import type { EditorDraft } from '../../../app/editor/types'

const draft: EditorDraft = {
  sessionKey: getDraftSessionKey(EDITOR_SESSION_TYPE.EXISTING, 'note-1'),
  sessionType: EDITOR_SESSION_TYPE.EXISTING,
  sourceNoteId: 'note-1',
  workingNote: {
    id: 'note-1',
    title: '',
    todos: [{ id: 'todo-1', text: '', completed: false }],
    categories: [],
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
  },
  history: {
    undoStack: [],
    redoStack: [],
    pendingTextOperation: {
      type: HISTORY_OPERATION_TYPE.SET_TITLE,
      before: 'Название',
      after: '',
    },
  },
  savedAt: '2026-08-20T01:00:00.000Z',
}

describe('draft storage adapter', () => {
  it('saves, loads and removes drafts by session key', () => {
    const storage = createMemoryStorage()
    const adapter = createDraftStorageAdapter(() => storage)

    expect(adapter.save(draft)).toEqual({ warning: null })
    expect(adapter.load(draft.sessionKey)).toEqual({ draft, warning: null })
    expect(JSON.parse(storage.getItem(DRAFTS_STORAGE_KEY) ?? '')).toEqual({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      drafts: [draft],
    })

    expect(adapter.remove(draft.sessionKey)).toEqual({ warning: null })
    expect(adapter.load(draft.sessionKey)).toEqual({ draft: null, warning: null })
  })

  it('preserves drafts for other editor sessions', () => {
    const storage = createMemoryStorage()
    const adapter = createDraftStorageAdapter(() => storage)
    const newDraft: EditorDraft = {
      ...draft,
      sessionKey: getDraftSessionKey(EDITOR_SESSION_TYPE.NEW, null),
      sessionType: EDITOR_SESSION_TYPE.NEW,
      sourceNoteId: null,
      workingNote: { ...draft.workingNote, id: 'note-new' },
    }

    adapter.save(draft)
    adapter.save(newDraft)
    adapter.remove(draft.sessionKey)

    expect(adapter.load(newDraft.sessionKey).draft).toEqual(newDraft)
  })

  it('rejects corrupted data and unsupported versions', () => {
    const storage = createMemoryStorage()
    const adapter = createDraftStorageAdapter(() => storage)
    storage.setItem(DRAFTS_STORAGE_KEY, '{broken')

    expect(adapter.load(draft.sessionKey).warning).toEqual({
      code: STORAGE_WARNING_CODE.CORRUPTED_DATA,
    })

    storage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify({ schemaVersion: 999, drafts: [] }))
    expect(adapter.load(draft.sessionKey).warning).toEqual({
      code: STORAGE_WARNING_CODE.UNSUPPORTED_VERSION,
    })
  })

  it('rejects a draft with malformed history', () => {
    const storage = createMemoryStorage()
    storage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      drafts: [{ ...draft, history: { undoStack: [{}], redoStack: [] } }],
    }))
    const adapter = createDraftStorageAdapter(() => storage)

    expect(adapter.load(draft.sessionKey).warning).toEqual({
      code: STORAGE_WARNING_CODE.CORRUPTED_DATA,
    })
  })

  it('accepts every compact history operation in a draft', () => {
    const todo = { id: 'todo-2', text: '', completed: false }
    const draftWithOperations: EditorDraft = {
      ...draft,
      history: {
        undoStack: [
          { type: HISTORY_OPERATION_TYPE.SET_TITLE, before: '', after: 'Заголовок' },
          {
            type: HISTORY_OPERATION_TYPE.SET_TODO_TEXT,
            todoId: 'todo-1',
            before: '',
            after: 'Текст',
          },
          {
            type: HISTORY_OPERATION_TYPE.SET_TODO_COMPLETED,
            todoId: 'todo-1',
            before: false,
            after: true,
          },
          { type: HISTORY_OPERATION_TYPE.ADD_TODO, todo, index: 1 },
          { type: HISTORY_OPERATION_TYPE.REMOVE_TODO, todo, index: 1 },
          { type: HISTORY_OPERATION_TYPE.ADD_CATEGORY, category: 'Работа', index: 0 },
          { type: HISTORY_OPERATION_TYPE.REMOVE_CATEGORY, category: 'Работа', index: 0 },
        ],
        redoStack: [],
        pendingTextOperation: null,
      },
    }

    expect(isEditorDraft(draftWithOperations)).toBe(true)
  })

  it('requires an ID for an existing session key', () => {
    expect(() => getDraftSessionKey(EDITOR_SESSION_TYPE.EXISTING, null)).toThrow(TypeError)
  })
})
