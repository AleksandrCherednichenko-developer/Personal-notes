import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import NoteCard from '../../../app/components/notes/NoteCard.vue'
import type { Note } from '../../../app/domain'

const note: Note = {
  id: 'note-1',
  title: 'Очень длинное название заметки без сокращения',
  todos: Array.from({ length: 8 }, (_, index) => ({
    id: `todo-${index + 1}`,
    text: `Задача ${index + 1}`,
    completed: index < 2,
  })),
  categories: ['Работа', 'Важное'],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
}

describe('NoteCard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders note details, progress and only the first six Todo', async () => {
    const wrapper = await mountSuspended(NoteCard, { props: { note, resetKey: 'default' } })

    expect(wrapper.get('h2').text()).toBe(note.title)
    expect(wrapper.findAll('[data-testid="note-category"]').map(chip => chip.text())).toEqual(
      note.categories,
    )
    expect(wrapper.get('[data-testid="note-progress-text"]').text()).toContain('2 из 8')
    expect(wrapper.findAll('[data-testid="note-card-todo"]')).toHaveLength(6)
    expect(wrapper.text()).not.toContain('Задача 7')
    expect(wrapper.text()).toContain('Показано 6 из 8')
  })

  it('presents Todo as read-only content and exposes explicit card actions', async () => {
    const wrapper = await mountSuspended(NoteCard, { props: { note, resetKey: 'default' } })
    const todoList = wrapper.get('[data-testid="note-card-todos"]')

    expect(todoList.findAll('input, button, [tabindex]').length).toBe(0)
    expect(todoList.text()).toContain('Выполнено')
    expect(wrapper.get('[data-testid="note-edit"]').attributes('href')).toBe('/notes/note-1')
    expect(wrapper.get('[data-testid="note-edit"]').attributes('aria-label')).toContain(note.title)

    await wrapper.get('[data-testid="note-delete"]').trigger('click')
    expect(wrapper.emitted('request-delete')).toEqual([[note.id]])
  })

  it('shows zero progress for a note without Todo', async () => {
    const wrapper = await mountSuspended(NoteCard, {
      props: { note: { ...note, todos: [] }, resetKey: 'default' },
    })

    expect(wrapper.get('[data-testid="note-progress"]').attributes('value')).toBe('0')
    expect(wrapper.text()).toContain('Нет задач')
  })

  it('reveals Todo in batches of six through the accessible fallback', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const longNote: Note = {
      ...note,
      todos: Array.from({ length: 14 }, (_, index) => ({
        id: `long-todo-${index}`,
        text: `Длинная задача ${index + 1}`,
        completed: false,
      })),
    }
    const wrapper = await mountSuspended(NoteCard, {
      props: { note: longNote, resetKey: 'default' },
    })

    expect(wrapper.findAll('[data-testid="note-card-todo"]')).toHaveLength(6)
    await wrapper.get('[data-testid="todo-reveal-more"]').trigger('click')
    expect(wrapper.findAll('[data-testid="note-card-todo"]')).toHaveLength(12)
    await wrapper.get('[data-testid="todo-reveal-more"]').trigger('click')
    expect(wrapper.findAll('[data-testid="note-card-todo"]')).toHaveLength(14)
    expect(wrapper.find('[data-testid="todo-reveal-more"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="todo-reveal-sentinel"]').exists()).toBe(false)
  })

  it('reveals the next batch when the page sentinel intersects', async () => {
    let intersectionCallback: IntersectionObserverCallback | null = null
    const disconnect = vi.fn()
    const observe = vi.fn()

    class IntersectionObserverMock {
      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback
      }

      disconnect = disconnect
      observe = observe
    }

    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
    const longNote = {
      ...note,
      todos: Array.from({ length: 13 }, (_, index) => ({
        id: `observer-todo-${index}`,
        text: `Задача ${index + 1}`,
        completed: false,
      })),
    }
    const wrapper = await mountSuspended(NoteCard, {
      props: { note: longNote, resetKey: 'default' },
      attachTo: document.body,
    })
    await nextTick()

    expect(observe).toHaveBeenCalledWith(
      wrapper.get('[data-testid="todo-reveal-sentinel"]').element,
    )
    intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    await nextTick()
    expect(wrapper.findAll('[data-testid="note-card-todo"]')).toHaveLength(12)

    window.dispatchEvent(new Event('scroll'))
    intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    await nextTick()
    expect(wrapper.findAll('[data-testid="note-card-todo"]')).toHaveLength(13)
    expect(disconnect).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('resets revealed Todo when list state or the Note changes', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const longNote = {
      ...note,
      todos: Array.from({ length: 12 }, (_, index) => ({
        id: `reset-todo-${index}`,
        text: `Задача ${index + 1}`,
        completed: false,
      })),
    }
    const wrapper = await mountSuspended(NoteCard, {
      props: { note: longNote, resetKey: 'first' },
    })

    await wrapper.get('[data-testid="todo-reveal-more"]').trigger('click')
    expect(wrapper.findAll('[data-testid="note-card-todo"]')).toHaveLength(12)

    await wrapper.setProps({ resetKey: 'second' })
    expect(wrapper.findAll('[data-testid="note-card-todo"]')).toHaveLength(6)

    await wrapper.get('[data-testid="todo-reveal-more"]').trigger('click')
    await wrapper.setProps({ note: { ...longNote, updatedAt: '2026-08-21T00:00:00.000Z' } })
    expect(wrapper.findAll('[data-testid="note-card-todo"]')).toHaveLength(6)
  })

  it('keeps the reset batch at six until the page is scrolled again', async () => {
    let intersectionCallback: IntersectionObserverCallback | null = null

    class IntersectionObserverMock {
      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback
      }

      disconnect = vi.fn()
      observe = vi.fn()
    }

    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
    const longNote = {
      ...note,
      todos: Array.from({ length: 13 }, (_, index) => ({
        id: `reset-observer-todo-${index}`,
        text: `Задача ${index + 1}`,
        completed: false,
      })),
    }
    const wrapper = await mountSuspended(NoteCard, {
      props: { note: longNote, resetKey: 'first' },
      attachTo: document.body,
    })

    intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    await nextTick()
    expect(wrapper.findAll('[data-testid="note-card-todo"]')).toHaveLength(12)

    await wrapper.setProps({ resetKey: 'second' })
    intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    await nextTick()
    expect(wrapper.findAll('[data-testid="note-card-todo"]')).toHaveLength(6)

    window.dispatchEvent(new Event('scroll'))
    intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    await nextTick()
    expect(wrapper.findAll('[data-testid="note-card-todo"]')).toHaveLength(12)
    wrapper.unmount()
  })
})
