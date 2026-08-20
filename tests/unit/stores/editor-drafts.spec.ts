import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HISTORY_OPERATION_TYPE } from '../../../app/history'
import { DRAFT_AUTOSAVE_DELAY_MS } from '../../../app/stores/editor'
import { EDITOR_SESSION_TYPE, getDraftSessionKey } from '../../../app/editor/types'
import type { EditorDraft } from '../../../app/editor/types'
import {
  cloneNote,
  createDraftStorage,
  createPageLifecycle,
  createStore,
  savedNote,
} from './editor-harness'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('editor draft autosave', () => {
  it('saves a draft after 800 ms and resets debounce on further changes', () => {
    const draftStorage = createDraftStorage()
    const { store } = createStore({ draftStorage })
    store.startExistingSession(savedNote.id)

    store.setTitle('Первый ввод')
    vi.advanceTimersByTime(500)
    store.setTitle('Актуальный ввод')
    vi.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS - 1)
    expect(draftStorage.save).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(draftStorage.save).toHaveBeenCalledTimes(1)
    expect(vi.mocked(draftStorage.save).mock.calls[0]?.[0]).toMatchObject({
      workingNote: { title: 'Актуальный ввод' },
      history: {
        pendingTextOperation: {
          before: savedNote.title,
          after: 'Актуальный ввод',
        },
      },
    })
  })

  it('flushes the current draft on pagehide and unsubscribes after cancel', () => {
    const draftStorage = createDraftStorage()
    const pageLifecycle = createPageLifecycle()
    const { store } = createStore({
      draftStorage,
      pageLifecycle: pageLifecycle.lifecycle,
    })
    store.startExistingSession(savedNote.id)
    store.addCategory('Работа')

    pageLifecycle.emitPageHide()

    expect(draftStorage.save).toHaveBeenCalledTimes(1)
    expect(pageLifecycle.hasListener()).toBe(true)
    store.cancelSession()
    expect(pageLifecycle.hasListener()).toBe(false)
  })

  it('does not create a draft for an unchanged session on pagehide', () => {
    const draftStorage = createDraftStorage()
    const pageLifecycle = createPageLifecycle()
    const { store } = createStore({
      draftStorage,
      pageLifecycle: pageLifecycle.lifecycle,
    })
    store.startExistingSession(savedNote.id)

    pageLifecycle.emitPageHide()

    expect(draftStorage.save).not.toHaveBeenCalled()
  })
})

describe('editor draft recovery', () => {
  it('detects a draft without restoring it automatically', () => {
    const draftStorage = createDraftStorage()
    const editorDraft: EditorDraft = {
      sessionKey: getDraftSessionKey(EDITOR_SESSION_TYPE.EXISTING, savedNote.id),
      sessionType: EDITOR_SESSION_TYPE.EXISTING,
      sourceNoteId: savedNote.id,
      workingNote: { ...cloneNote(savedNote), title: 'Черновик' },
      history: { undoStack: [], redoStack: [], pendingTextOperation: null },
      savedAt: '2026-08-20T02:00:00.000Z',
    }
    vi.mocked(draftStorage.load).mockReturnValue({ draft: editorDraft, warning: null })
    const { store } = createStore({ draftStorage })

    store.startExistingSession(savedNote.id)

    expect(store.availableDraft).toEqual(editorDraft)
    expect(store.workingNote?.title).toBe(savedNote.title)
  })

  it('restores working data, undo stack and pending text operation', () => {
    const draftStorage = createDraftStorage()
    const editorDraft: EditorDraft = {
      sessionKey: getDraftSessionKey(EDITOR_SESSION_TYPE.EXISTING, savedNote.id),
      sessionType: EDITOR_SESSION_TYPE.EXISTING,
      sourceNoteId: savedNote.id,
      workingNote: {
        ...cloneNote(savedNote),
        title: 'Новый заголовок',
        categories: ['Работа'],
      },
      history: {
        undoStack: [{
          type: HISTORY_OPERATION_TYPE.ADD_CATEGORY,
          category: 'Работа',
          index: 0,
        }],
        redoStack: [],
        pendingTextOperation: {
          type: HISTORY_OPERATION_TYPE.SET_TITLE,
          before: savedNote.title,
          after: 'Новый заголовок',
        },
      },
      savedAt: '2026-08-20T02:00:00.000Z',
    }
    vi.mocked(draftStorage.load).mockReturnValue({ draft: editorDraft, warning: null })
    const { store } = createStore({ draftStorage })
    store.startExistingSession(savedNote.id)

    store.restoreDraft()
    store.undo()
    expect(store.workingNote?.title).toBe(savedNote.title)
    store.undo()
    expect(store.workingNote?.categories).toEqual([])
  })

  it('discards a detected draft and keeps the clean session', () => {
    const draftStorage = createDraftStorage()
    vi.mocked(draftStorage.load).mockReturnValue({
      draft: {
        sessionKey: getDraftSessionKey(EDITOR_SESSION_TYPE.EXISTING, savedNote.id),
        sessionType: EDITOR_SESSION_TYPE.EXISTING,
        sourceNoteId: savedNote.id,
        workingNote: { ...cloneNote(savedNote), title: 'Черновик' },
        history: { undoStack: [], redoStack: [], pendingTextOperation: null },
        savedAt: '2026-08-20T02:00:00.000Z',
      },
      warning: null,
    })
    const { store } = createStore({ draftStorage })
    store.startExistingSession(savedNote.id)

    store.discardDraft()

    expect(draftStorage.remove).toHaveBeenCalledWith(
      getDraftSessionKey(EDITOR_SESSION_TYPE.EXISTING, savedNote.id),
    )
    expect(store.availableDraft).toBeNull()
    expect(store.workingNote?.title).toBe(savedNote.title)
  })
})
