import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { getActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import HomePage from '../../../app/pages/index.vue'
import { PERSISTED_SCHEMA_VERSION } from '../../../app/domain'
import { NOTES_STORAGE_KEY } from '../../../app/persistence/notes-storage'
import { useNotesStore } from '../../../app/stores/notes'
import type { Note } from '../../../app/domain'

const savedNote: Note = {
  id: 'note-1',
  title: 'Планы на неделю',
  todos: [{ id: 'todo-1', text: 'Подготовить отчёт', completed: true }],
  categories: ['Работа'],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
}

describe('home page', () => {
  beforeEach(() => {
    if (getActivePinia()) useNotesStore().$reset()
    localStorage.clear()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows an empty state and a create-note navigation', async () => {
    const wrapper = await mountSuspended(HomePage, { route: '/' })

    expect(wrapper.get('h1').text()).toBe('Мои заметки')
    expect(wrapper.get('main').attributes('id')).toBe('app-main')
    expect(wrapper.text()).toContain('Заметок пока нет')
    expect(wrapper.get('[data-testid="create-note"]').attributes('href')).toBe('/notes/new')
  })

  it('loads saved notes and links each card to its editor', async () => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [savedNote],
    }))

    const wrapper = await mountSuspended(HomePage, { route: '/' })

    expect(wrapper.findAll('[data-testid="note-card"]')).toHaveLength(1)
    expect(wrapper.text()).toContain(savedNote.title)
    expect(wrapper.get('[data-testid="note-edit"]').attributes('href')).toBe(
      `/notes/${savedNote.id}`,
    )
  })

  it('deletes a note only after explicit confirmation', async () => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [savedNote],
    }))
    const wrapper = await mountSuspended(HomePage, {
      route: '/',
      attachTo: document.body,
    })

    await wrapper.get('[data-testid="note-delete"]').trigger('click')
    await nextTick()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(savedNote.title)

    document.querySelector<HTMLButtonElement>('[data-testid="modal-cancel"]')?.click()
    await nextTick()
    expect(wrapper.findAll('[data-testid="note-card"]')).toHaveLength(1)

    await wrapper.get('[data-testid="note-delete"]').trigger('click')
    await nextTick()
    document.querySelector<HTMLButtonElement>('[data-testid="modal-confirm"]')?.click()
    await nextTick()

    expect(wrapper.findAll('[data-testid="note-card"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('Заметок пока нет')
    expect(JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) ?? 'null')).toMatchObject({
      notes: [],
    })
    wrapper.unmount()
  })

  it('restores search and category filters from the URL', async () => {
    const secondNote: Note = {
      ...savedNote,
      id: 'note-2',
      title: 'Домашние дела',
      todos: [{ id: 'todo-2', text: 'Купить молоко', completed: false }],
      categories: ['Дом'],
    }
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [savedNote, secondNote],
    }))

    const wrapper = await mountSuspended(HomePage, {
      route: '/?q=молоко&category=Дом',
    })

    expect(wrapper.get<HTMLInputElement>('[data-testid="notes-search"]').element.value).toBe(
      'молоко',
    )
    expect(wrapper.findAll('[data-testid="note-card"]')).toHaveLength(1)
    expect(wrapper.text()).toContain(secondNote.title)
    expect(wrapper.text()).not.toContain(savedNote.title)
  })

  it('applies search after a 200 ms debounce and shows a no-results state', async () => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [savedNote],
    }))
    const wrapper = await mountSuspended(HomePage, { route: '/' })
    vi.useFakeTimers()
    const search = wrapper.get<HTMLInputElement>('[data-testid="notes-search"]')

    await search.setValue('нет совпадений')
    await vi.advanceTimersByTimeAsync(199)
    expect(wrapper.findAll('[data-testid="note-card"]')).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(1)
    vi.useRealTimers()
    await flushPromises()
    await nextTick()
    expect(wrapper.findAll('[data-testid="note-card"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('Ничего не найдено')
  })

  it('refreshes from valid cross-tab storage events and preserves UI on corrupted data', async () => {
    const wrapper = await mountSuspended(HomePage, { route: '/' })

    window.dispatchEvent(new StorageEvent('storage', {
      key: NOTES_STORAGE_KEY,
      newValue: JSON.stringify({
        schemaVersion: PERSISTED_SCHEMA_VERSION,
        notes: [savedNote],
      }),
    }))
    await nextTick()
    expect(wrapper.text()).toContain(savedNote.title)

    window.dispatchEvent(new StorageEvent('storage', {
      key: NOTES_STORAGE_KEY,
      newValue: '{broken',
    }))
    await nextTick()
    expect(wrapper.text()).toContain(savedNote.title)
    const warning = wrapper.get('[data-testid="storage-warning"]')
    expect(warning.text()).toContain(
      'Не удалось прочитать сохранённые данные',
    )
    expect(warning.attributes('aria-live')).toBe('polite')
    wrapper.unmount()
  })
})
