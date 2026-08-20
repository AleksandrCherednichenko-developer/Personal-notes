<script setup lang="ts">
import { nextTick, ref, useId } from 'vue'

import CategoryChipsInput from './CategoryChipsInput.vue'
import { VALIDATION_FIELD } from '../../domain'
import type { Note, ValidationIssue } from '../../domain'

interface Props {
  canRedo: boolean
  canDelete: boolean
  canUndo: boolean
  categorySuggestions: readonly string[]
  note: Note
  validationIssues: readonly ValidationIssue[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'add-todo': []
  'add-category': [category: string]
  'commit-text-change': []
  'remove-todo': [todoId: string]
  'remove-category': [category: string]
  'request-cancel': []
  'request-delete': []
  'redo': []
  'save': []
  'update-title': [title: string]
  'update-todo-completed': [todoId: string, completed: boolean]
  'update-todo-text': [todoId: string, text: string]
  'undo': []
}>()

const componentId = useId()
const titleInputId = `note-title-${componentId}`
const titleErrorId = `note-title-error-${componentId}`
const todoList = ref<HTMLElement | null>(null)

const hasTitleError = (): boolean => props.validationIssues.some(
  issue => issue.field === VALIDATION_FIELD.TITLE,
)

const hasTodoError = (todoId: string): boolean => props.validationIssues.some(
  issue => issue.field === VALIDATION_FIELD.TODO_TEXT && issue.todoId === todoId,
)

const getTodoInputId = (todoId: string): string => `todo-text-${componentId}-${todoId}`
const getTodoErrorId = (todoId: string): string => `todo-error-${componentId}-${todoId}`

const getInputValue = (event: Event): string | null => {
  const target = event.target
  return target instanceof HTMLInputElement ? target.value : null
}

const getCheckedValue = (event: Event): boolean | null => {
  const target = event.target
  return target instanceof HTMLInputElement ? target.checked : null
}

const handleTitleInput = (event: Event): void => {
  const value = getInputValue(event)
  if (value !== null) emit('update-title', value)
}

const handleTodoInput = (todoId: string, event: Event): void => {
  const value = getInputValue(event)
  if (value !== null) emit('update-todo-text', todoId, value)
}

const handleTodoCompleted = (todoId: string, event: Event): void => {
  const checked = getCheckedValue(event)
  if (checked !== null) emit('update-todo-completed', todoId, checked)
}

const handleAddTodo = async (): Promise<void> => {
  const previousCount = props.note.todos.length
  emit('add-todo')
  await nextTick()

  const inputs = todoList.value?.querySelectorAll<HTMLInputElement>('[data-testid="todo-text"]')
  if (inputs && inputs.length > previousCount) {
    inputs.item(inputs.length - 1).focus()
  }
}
</script>

<template>
  <form
    class="note-editor-form"
    novalidate
    @submit.prevent="emit('save')"
  >
    <div
      class="note-editor-form__history"
      role="toolbar"
      aria-label="История изменений"
    >
      <button
        class="note-editor-form__secondary-button"
        data-testid="history-undo"
        type="button"
        :disabled="!canUndo"
        @click="emit('undo')"
      >
        Отменить
      </button>
      <button
        class="note-editor-form__secondary-button"
        data-testid="history-redo"
        type="button"
        :disabled="!canRedo"
        @click="emit('redo')"
      >
        Повторить
      </button>
    </div>

    <div class="note-editor-form__field">
      <label
        class="note-editor-form__label"
        :for="titleInputId"
      >
        Название заметки
      </label>
      <input
        :id="titleInputId"
        class="note-editor-form__input note-editor-form__input--title"
        name="title"
        type="text"
        autocomplete="off"
        :value="note.title"
        :aria-invalid="hasTitleError()"
        :aria-describedby="hasTitleError() ? titleErrorId : undefined"
        @blur="emit('commit-text-change')"
        @input="handleTitleInput"
      >
      <p
        v-if="hasTitleError()"
        :id="titleErrorId"
        class="note-editor-form__error"
        aria-live="assertive"
        role="alert"
      >
        Введите название заметки.
      </p>
    </div>

    <CategoryChipsInput
      :categories="note.categories"
      :suggestions="categorySuggestions"
      @add="emit('add-category', $event)"
      @remove="emit('remove-category', $event)"
    />

    <fieldset class="note-editor-form__todos">
      <legend class="note-editor-form__legend">
        Задачи
      </legend>

      <p
        v-if="note.todos.length === 0"
        class="note-editor-form__empty"
      >
        В этой заметке пока нет задач.
      </p>

      <div
        v-else
        ref="todoList"
        class="note-editor-form__todo-list"
      >
        <div
          v-for="(todo, index) in note.todos"
          :key="todo.id"
          class="note-editor-form__todo"
        >
          <label class="note-editor-form__checkbox-target">
            <input
              class="note-editor-form__checkbox"
              data-testid="todo-completed"
              type="checkbox"
              :checked="todo.completed"
              @change="handleTodoCompleted(todo.id, $event)"
            >
            <span class="visually-hidden">
              Отметить задачу {{ index + 1 }} как
              {{ todo.completed ? 'невыполненную' : 'выполненную' }}
            </span>
          </label>

          <div class="note-editor-form__todo-field">
            <label
              class="visually-hidden"
              :for="getTodoInputId(todo.id)"
            >
              Текст задачи {{ index + 1 }}
            </label>
            <input
              :id="getTodoInputId(todo.id)"
              class="note-editor-form__input"
              data-testid="todo-text"
              type="text"
              autocomplete="off"
              :value="todo.text"
              :aria-invalid="hasTodoError(todo.id)"
              :aria-describedby="hasTodoError(todo.id) ? getTodoErrorId(todo.id) : undefined"
              @blur="emit('commit-text-change')"
              @input="handleTodoInput(todo.id, $event)"
            >
            <p
              v-if="hasTodoError(todo.id)"
              :id="getTodoErrorId(todo.id)"
              class="note-editor-form__error"
              aria-live="assertive"
              role="alert"
            >
              Введите текст задачи или удалите пустой пункт.
            </p>
          </div>

          <button
            class="note-editor-form__icon-button"
            data-testid="todo-remove"
            type="button"
            :aria-label="`Удалить задачу ${index + 1}`"
            @click="emit('remove-todo', todo.id)"
          >
            Удалить
          </button>
        </div>
      </div>

      <button
        class="note-editor-form__secondary-button note-editor-form__add-button"
        data-testid="todo-add"
        type="button"
        @click="handleAddTodo"
      >
        Добавить задачу
      </button>
    </fieldset>

    <div class="note-editor-form__actions">
      <button
        class="note-editor-form__primary-button"
        type="submit"
      >
        Сохранить
      </button>
      <button
        class="note-editor-form__secondary-button"
        data-testid="editor-cancel"
        type="button"
        @click="emit('request-cancel')"
      >
        Отменить редактирование
      </button>
      <button
        v-if="canDelete"
        class="note-editor-form__danger-button"
        data-testid="editor-delete"
        type="button"
        @click="emit('request-delete')"
      >
        Удалить заметку
      </button>
    </div>
  </form>
</template>

<style scoped lang="scss">
.note-editor-form {
  display: grid;
  gap: 28px;
}

.note-editor-form__field,
.note-editor-form__todo-field {
  display: grid;
  gap: 8px;
}

.note-editor-form__label,
.note-editor-form__legend {
  color: var(--color-heading);
  font-weight: 700;
}

.note-editor-form__input {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--color-control-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-heading);
}

.note-editor-form__input--title {
  font-size: 1.125rem;
}

.note-editor-form__input[aria-invalid="true"] {
  border-color: var(--color-danger);
}

.note-editor-form__input:focus-visible,
.note-editor-form__checkbox:focus-visible,
.note-editor-form button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.note-editor-form__history {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.note-editor-form__error {
  margin: 0;
  color: var(--color-danger-hover);
  font-size: 0.875rem;
}

.note-editor-form__todos {
  min-width: 0;
  padding: 0;
  border: 0;
}

.note-editor-form__legend {
  margin-bottom: 14px;
  padding: 0;
  font-size: 1.125rem;
}

.note-editor-form__empty {
  margin: 0 0 16px;
  color: var(--color-subtle);
}

.note-editor-form__todo-list {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}

.note-editor-form__todo {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
}

.note-editor-form__checkbox-target {
  display: grid;
  width: 44px;
  height: 44px;
  cursor: pointer;
  place-items: center;
}

.note-editor-form__checkbox {
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: var(--color-primary);
}

.note-editor-form__icon-button,
.note-editor-form__primary-button,
.note-editor-form__secondary-button,
.note-editor-form__danger-button {
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 650;
}

.note-editor-form__icon-button,
.note-editor-form__secondary-button {
  border: 1px solid var(--color-control-border);
  background: var(--color-surface);
  color: var(--color-control-text);
}

.note-editor-form__primary-button {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: var(--color-surface);
}

.note-editor-form__danger-button {
  border: 1px solid var(--color-danger);
  background: var(--color-surface);
  color: var(--color-danger);
}

.note-editor-form__add-button {
  width: fit-content;
}

.note-editor-form button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.note-editor-form__icon-button:hover,
.note-editor-form__secondary-button:hover:not(:disabled) {
  border-color: var(--color-control-strong);
  background: var(--color-neutral-soft);
}

.note-editor-form__primary-button:hover {
  border-color: var(--color-primary-hover);
  background: var(--color-primary-hover);
}

.note-editor-form__danger-button:hover {
  background: var(--color-danger-soft);
}

.note-editor-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  margin: -1px;
}

@media (max-width: 640px) {
  .note-editor-form__todo {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .note-editor-form__icon-button {
    grid-column: 2;
    justify-self: start;
  }

  .note-editor-form__actions > button {
    flex: 1 1 100%;
  }
}
</style>
