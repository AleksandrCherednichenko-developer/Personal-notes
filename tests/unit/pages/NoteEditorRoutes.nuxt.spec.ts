import { mountSuspended } from '@nuxt/test-utils/runtime'
import { getActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import ExistingNotePage from '../../../app/pages/notes/[id].vue'
import NewNotePage from '../../../app/pages/notes/new.vue'
import { PERSISTED_SCHEMA_VERSION } from '../../../app/domain'
import { useEditorStore } from '../../../app/editor'
import { DRAFTS_STORAGE_KEY } from '../../../app/editor/draft-storage'
import { EDITOR_SESSION_TYPE, getDraftSessionKey } from '../../../app/editor/types'
import { HISTORY_OPERATION_TYPE } from '../../../app/history'
import { NOTES_STORAGE_KEY } from '../../../app/persistence/notes-storage'
import { useNotesStore } from '../../../app/stores/notes'
import type { Note } from '../../../app/domain'

const savedNote: Note = {
  id: 'note-1',
  title: 'Сохранённая заметка',
  todos: [{ id: 'todo-1', text: 'Задача', completed: false }],
  categories: [],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
}

const setExistingDraft = (): void => {
  const sessionKey = getDraftSessionKey(EDITOR_SESSION_TYPE.EXISTING, savedNote.id)

  localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify({
    schemaVersion: PERSISTED_SCHEMA_VERSION,
    drafts: [{
      sessionKey,
      sessionType: EDITOR_SESSION_TYPE.EXISTING,
      sourceNoteId: savedNote.id,
      workingNote: { ...savedNote, title: 'Несохранённый черновик' },
      history: {
        undoStack: [{
          type: HISTORY_OPERATION_TYPE.SET_TITLE,
          before: savedNote.title,
          after: 'Несохранённый черновик',
        }],
        redoStack: [],
        pendingTextOperation: null,
      },
      savedAt: '2026-08-20T04:00:00.000Z',
    }],
  }))
}

describe('note editor routes', () => {
  beforeEach(() => {
    if (getActivePinia()) {
      useEditorStore().cancelSession()
      useNotesStore().$reset()
    }

    localStorage.clear()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('validates and saves a new note through the shared editor', async () => {
    const wrapper = await mountSuspended(NewNotePage, {
      route: '/notes/new',
    })

    expect(wrapper.get('h1').text()).toBe('Новая заметка')
    expect(wrapper.get('main').attributes('id')).toBe('app-main')

    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Введите название заметки.')

    await wrapper.get<HTMLInputElement>('input[name="title"]').setValue('Покупки')
    const categoryInput = wrapper.get<HTMLInputElement>('[data-testid="category-input"]')
    await categoryInput.setValue('Личное')
    await categoryInput.trigger('keydown', { key: 'Enter' })
    await wrapper.get('[data-testid="todo-add"]').trigger('click')
    await wrapper.get<HTMLInputElement>('[data-testid="todo-text"]').setValue('Купить хлеб')
    await wrapper.get('form').trigger('submit')

    const envelope: unknown = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) ?? 'null')
    expect(envelope).toMatchObject({
      notes: [{
        title: 'Покупки',
        categories: ['Личное'],
        todos: [{ text: 'Купить хлеб' }],
      }],
    })

    wrapper.unmount()
  })

  it('restores persisted chips and suggests unused categories from saved notes', async () => {
    const noteWithCategories: Note = {
      ...savedNote,
      categories: ['Работа'],
    }
    const otherNote: Note = {
      ...savedNote,
      id: 'note-2',
      title: 'Домашние дела',
      categories: ['Дом', 'работа'],
    }
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [noteWithCategories, otherNote],
    }))

    const wrapper = await mountSuspended(ExistingNotePage, {
      route: `/notes/${savedNote.id}`,
    })

    expect(wrapper.get('[data-testid="category-remove-Работа"]').exists()).toBe(true)
    const categoryInput = wrapper.get<HTMLInputElement>('[data-testid="category-input"]')
    const suggestionValues = wrapper
      .findAll(`#${categoryInput.attributes('list')} option`)
      .map(option => option.attributes('value'))
    expect(suggestionValues).toEqual(['Дом'])

    wrapper.unmount()
  })

  it('requires confirmation before canceling the editor session', async () => {
    const wrapper = await mountSuspended(NewNotePage, {
      route: '/notes/new',
    })

    await wrapper.get('[data-testid="editor-cancel"]').trigger('click')
    await nextTick()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()

    document.querySelector<HTMLButtonElement>('[data-testid="modal-confirm"]')?.click()
    await nextTick()

    expect(wrapper.find('form').exists()).toBe(false)
    expect(localStorage.getItem(NOTES_STORAGE_KEY)).toBeNull()

    wrapper.unmount()
  })

  it('loads and deletes an existing note only after confirmation', async () => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [savedNote],
    }))
    const wrapper = await mountSuspended(ExistingNotePage, {
      route: `/notes/${savedNote.id}`,
    })

    expect(wrapper.get<HTMLInputElement>('input[name="title"]').element.value).toBe(
      savedNote.title,
    )

    await wrapper.get('[data-testid="editor-delete"]').trigger('click')
    await nextTick()
    document.querySelector<HTMLButtonElement>('[data-testid="modal-confirm"]')?.click()
    await nextTick()

    const envelope: unknown = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) ?? 'null')
    expect(envelope).toMatchObject({ notes: [] })

    wrapper.unmount()
  })

  it('renders a stable not-found state for an unknown direct URL', async () => {
    const wrapper = await mountSuspended(ExistingNotePage, {
      route: '/notes/missing',
    })
    await nextTick()

    expect(wrapper.get('h1').text()).toBe('Заметка не найдена')
    expect(wrapper.text()).toContain('адрес указан неверно')

    wrapper.unmount()
  })

  it('offers a stored draft without applying it and restores its history explicitly', async () => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [savedNote],
    }))
    setExistingDraft()

    const wrapper = await mountSuspended(ExistingNotePage, {
      route: `/notes/${savedNote.id}`,
      attachTo: document.body,
    })
    await nextTick()

    const titleInput = wrapper.get<HTMLInputElement>('input[name="title"]')
    expect(titleInput.element.value).toBe(savedNote.title)
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(titleInput.element.closest('[inert]')).not.toBeNull()

    document.querySelector<HTMLButtonElement>('[data-testid="draft-restore"]')?.click()
    await nextTick()

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(titleInput.element.value).toBe('Несохранённый черновик')

    await wrapper.get('[data-testid="history-undo"]').trigger('click')
    expect(titleInput.element.value).toBe(savedNote.title)
    wrapper.unmount()
  })

  it('discards a stored draft and keeps the persisted note unchanged', async () => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [savedNote],
    }))
    setExistingDraft()

    const wrapper = await mountSuspended(ExistingNotePage, {
      route: `/notes/${savedNote.id}`,
      attachTo: document.body,
    })
    await nextTick()

    document.querySelector<HTMLButtonElement>('[data-testid="draft-discard"]')?.click()
    await nextTick()

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(wrapper.get<HTMLInputElement>('input[name="title"]').element.value).toBe(
      savedNote.title,
    )
    expect(JSON.parse(localStorage.getItem(DRAFTS_STORAGE_KEY) ?? 'null')).toMatchObject({
      drafts: [],
    })
    wrapper.unmount()
  })

  it('combines history buttons with global shortcuts without intercepting input undo', async () => {
    const wrapper = await mountSuspended(NewNotePage, {
      route: '/notes/new',
      attachTo: document.body,
    })
    const titleInput = wrapper.get<HTMLInputElement>('input[name="title"]')
    const undoButton = wrapper.get<HTMLButtonElement>('[data-testid="history-undo"]')
    const redoButton = wrapper.get<HTMLButtonElement>('[data-testid="history-redo"]')

    expect(undoButton.element.disabled).toBe(true)
    expect(redoButton.element.disabled).toBe(true)

    await titleInput.setValue('Первый вариант')
    await titleInput.trigger('blur')
    expect(undoButton.element.disabled).toBe(false)

    await undoButton.trigger('click')
    expect(titleInput.element.value).toBe('')
    expect(redoButton.element.disabled).toBe(false)

    const redoEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: 'z',
      shiftKey: true,
    })
    window.dispatchEvent(redoEvent)
    await nextTick()
    expect(redoEvent.defaultPrevented).toBe(true)
    expect(titleInput.element.value).toBe('Первый вариант')

    titleInput.element.focus()
    const nativeUndoEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: 'z',
    })
    titleInput.element.dispatchEvent(nativeUndoEvent)
    expect(nativeUndoEvent.defaultPrevented).toBe(false)

    await titleInput.setValue('Результат browser undo')
    await titleInput.trigger('blur')
    expect(redoButton.element.disabled).toBe(true)

    const outsideUndoEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      metaKey: true,
      key: 'z',
    })
    window.dispatchEvent(outsideUndoEvent)
    await nextTick()
    expect(outsideUndoEvent.defaultPrevented).toBe(true)
    expect(titleInput.element.value).toBe('Первый вариант')

    wrapper.unmount()
  })

  it('offers to save the working copy under a new ID after external deletion', async () => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [savedNote],
    }))
    const wrapper = await mountSuspended(ExistingNotePage, {
      route: `/notes/${savedNote.id}`,
      attachTo: document.body,
    })
    await wrapper.get<HTMLInputElement>('input[name="title"]').setValue('Спасённая копия')

    window.dispatchEvent(new StorageEvent('storage', {
      key: NOTES_STORAGE_KEY,
      newValue: JSON.stringify({ schemaVersion: PERSISTED_SCHEMA_VERSION, notes: [] }),
    }))
    await nextTick()

    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'Заметка удалена в другой вкладке',
    )
    document.querySelector<HTMLButtonElement>('[data-testid="conflict-save-as-new"]')?.click()
    await nextTick()

    const envelope: unknown = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) ?? 'null')
    expect(envelope).toMatchObject({
      notes: [{ title: 'Спасённая копия' }],
    })
    expect((envelope as { notes: Note[] }).notes[0]?.id).not.toBe(savedNote.id)
    wrapper.unmount()
  })
})
