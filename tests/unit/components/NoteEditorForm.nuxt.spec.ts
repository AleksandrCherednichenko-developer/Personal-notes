import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'

import NoteEditorForm from '../../../app/components/notes/NoteEditorForm.vue'
import { VALIDATION_CODE, VALIDATION_FIELD } from '../../../app/domain'
import type { Note } from '../../../app/domain'

const note: Note = {
  id: 'note-1',
  title: 'Планы',
  todos: [{ id: 'todo-1', text: 'Купить молоко', completed: false }],
  categories: [],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
}

describe('NoteEditorForm', () => {
  it('emits title and Todo editing actions without mutating its note prop', async () => {
    const wrapper = await mountSuspended(NoteEditorForm, {
      props: {
        canRedo: false,
        canDelete: true,
        canUndo: false,
        categorySuggestions: [],
        note: structuredClone(note),
        validationIssues: [],
      },
    })

    await wrapper.get<HTMLInputElement>('input[name="title"]').setValue('Новые планы')
    await wrapper.get<HTMLInputElement>('[data-testid="todo-text"]').setValue('Купить хлеб')
    await wrapper.get<HTMLInputElement>('[data-testid="todo-completed"]').setValue(true)
    await wrapper.get('[data-testid="todo-remove"]').trigger('click')

    expect(wrapper.emitted('update-title')?.[0]).toEqual(['Новые планы'])
    expect(wrapper.emitted('update-todo-text')?.[0]).toEqual(['todo-1', 'Купить хлеб'])
    expect(wrapper.emitted('update-todo-completed')?.[0]).toEqual(['todo-1', true])
    expect(wrapper.emitted('remove-todo')?.[0]).toEqual(['todo-1'])
    expect(wrapper.props('note')).toEqual(note)
  })

  it('provides a full-size labeled target for the Todo checkbox', async () => {
    const wrapper = await mountSuspended(NoteEditorForm, {
      props: {
        canDelete: true,
        canRedo: false,
        canUndo: false,
        categorySuggestions: [],
        note,
        validationIssues: [],
      },
    })

    const checkbox = wrapper.get<HTMLInputElement>('[data-testid="todo-completed"]')
    const target = checkbox.element.closest('label')

    expect(target?.classList.contains('note-editor-form__checkbox-target')).toBe(true)
    expect(target?.textContent).toContain('Отметить задачу 1 как выполненную')
  })

  it('renders associated inline errors for an invalid title and Todo', async () => {
    const invalidNote = structuredClone(note)
    invalidNote.title = ''
    invalidNote.todos[0]!.text = ''

    const wrapper = await mountSuspended(NoteEditorForm, {
      props: {
        canRedo: false,
        canDelete: true,
        canUndo: false,
        categorySuggestions: [],
        note: invalidNote,
        validationIssues: [
          { code: VALIDATION_CODE.REQUIRED, field: VALIDATION_FIELD.TITLE },
          {
            code: VALIDATION_CODE.REQUIRED,
            field: VALIDATION_FIELD.TODO_TEXT,
            todoId: 'todo-1',
          },
        ],
      },
    })

    const titleInput = wrapper.get<HTMLInputElement>('input[name="title"]')
    const todoInput = wrapper.get<HTMLInputElement>('[data-testid="todo-text"]')

    expect(titleInput.attributes('aria-invalid')).toBe('true')
    expect(wrapper.get(`#${titleInput.attributes('aria-describedby')}`).text()).toContain(
      'Введите название',
    )
    expect(todoInput.attributes('aria-invalid')).toBe('true')
    expect(wrapper.get(`#${todoInput.attributes('aria-describedby')}`).text()).toContain(
      'Введите текст задачи',
    )
    expect(wrapper.findAll('[role="alert"]').every(
      error => error.attributes('aria-live') === 'assertive',
    )).toBe(true)
  })

  it('exposes save, cancel and existing-note delete actions', async () => {
    const wrapper = await mountSuspended(NoteEditorForm, {
      props: {
        canRedo: false,
        canDelete: true,
        canUndo: false,
        categorySuggestions: [],
        note,
        validationIssues: [],
      },
    })

    await wrapper.get('form').trigger('submit')
    await wrapper.get('[data-testid="editor-cancel"]').trigger('click')
    await wrapper.get('[data-testid="editor-delete"]').trigger('click')

    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('request-cancel')).toHaveLength(1)
    expect(wrapper.emitted('request-delete')).toHaveLength(1)
  })

  it('hides delete for a new note', async () => {
    const wrapper = await mountSuspended(NoteEditorForm, {
      props: {
        canRedo: false,
        canDelete: false,
        canUndo: false,
        categorySuggestions: [],
        note,
        validationIssues: [],
      },
    })

    expect(wrapper.find('[data-testid="editor-delete"]').exists()).toBe(false)
  })

  it('moves focus to the Todo appended by its parent', async () => {
    const Harness = defineComponent({
      components: { NoteEditorForm },
      setup() {
        const workingNote = ref(structuredClone(note))

        const addTodo = (): void => {
          workingNote.value = {
            ...workingNote.value,
            todos: [
              ...workingNote.value.todos,
              { id: 'todo-2', text: '', completed: false },
            ],
          }
        }

        return { addTodo, workingNote }
      },
      template: `
        <NoteEditorForm
          :can-redo="false"
          :can-delete="false"
          :can-undo="false"
          :category-suggestions="[]"
          :note="workingNote"
          :validation-issues="[]"
          @add-todo="addTodo"
        />
      `,
    })
    const wrapper = await mountSuspended(Harness, { attachTo: document.body })

    await wrapper.get('[data-testid="todo-add"]').trigger('click')
    await nextTick()

    const inputs = wrapper.findAll<HTMLInputElement>('[data-testid="todo-text"]')
    expect(inputs).toHaveLength(2)
    expect(document.activeElement).toBe(inputs[1]?.element)

    wrapper.unmount()
  })

  it('renders application history controls with reactive disabled states', async () => {
    const wrapper = await mountSuspended(NoteEditorForm, {
      props: {
        canDelete: false,
        canRedo: false,
        canUndo: true,
        categorySuggestions: [],
        note,
        validationIssues: [],
      },
    })

    const undoButton = wrapper.get<HTMLButtonElement>('[data-testid="history-undo"]')
    const redoButton = wrapper.get<HTMLButtonElement>('[data-testid="history-redo"]')

    expect(undoButton.element.disabled).toBe(false)
    expect(redoButton.element.disabled).toBe(true)

    await undoButton.trigger('click')
    await wrapper.setProps({ canRedo: true, canUndo: false })
    await redoButton.trigger('click')

    expect(wrapper.emitted('undo')).toHaveLength(1)
    expect(wrapper.emitted('redo')).toHaveLength(1)
    expect(undoButton.element.disabled).toBe(true)
    expect(redoButton.element.disabled).toBe(false)
  })

  it('requests text transaction commit when a text field loses focus', async () => {
    const wrapper = await mountSuspended(NoteEditorForm, {
      props: {
        canDelete: false,
        canRedo: false,
        canUndo: false,
        categorySuggestions: [],
        note,
        validationIssues: [],
      },
    })

    await wrapper.get('input[name="title"]').trigger('blur')
    await wrapper.get('[data-testid="todo-text"]').trigger('blur')

    expect(wrapper.emitted('commit-text-change')).toHaveLength(2)
  })
})
