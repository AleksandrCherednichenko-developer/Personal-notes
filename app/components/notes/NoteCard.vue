<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { Note } from '../../domain'

const props = defineProps<{
  note: Note
  resetKey: string
}>()

const emit = defineEmits<{
  'request-delete': [noteId: string]
}>()

const TODO_BATCH_SIZE = 6
const visibleTodoCount = ref(TODO_BATCH_SIZE)
const revealSentinel = ref<HTMLElement | null>(null)
const supportsIntersectionObserver = ref(false)
const visibleTodos = computed(() => props.note.todos.slice(0, visibleTodoCount.value))
const hasMoreTodos = computed(() => visibleTodoCount.value < props.note.todos.length)
const completedTodoCount = computed(() => props.note.todos.filter(todo => todo.completed).length)
const progressMaximum = computed(() => Math.max(props.note.todos.length, 1))

let observer: IntersectionObserver | null = null
let isObserverArmed = true
let isWaitingForScroll = false

const revealMoreTodos = (): void => {
  visibleTodoCount.value = Math.min(
    visibleTodoCount.value + TODO_BATCH_SIZE,
    props.note.todos.length,
  )
}

const observeSentinel = (): void => {
  observer?.disconnect()
  if (isObserverArmed && revealSentinel.value !== null && hasMoreTodos.value) {
    observer?.observe(revealSentinel.value)
  }
}

const stopWaitingForScroll = (): void => {
  if (!isWaitingForScroll) return
  window.removeEventListener('scroll', armObserver)
  isWaitingForScroll = false
}

function armObserver(): void {
  stopWaitingForScroll()
  isObserverArmed = true
  observeSentinel()
}

const waitForNextScroll = (): void => {
  isObserverArmed = false
  observer?.disconnect()
  isWaitingForScroll = true
  window.addEventListener('scroll', armObserver, { once: true, passive: true })
}

const resetVisibleTodos = (): void => {
  visibleTodoCount.value = TODO_BATCH_SIZE
  if (supportsIntersectionObserver.value) waitForNextScroll()
}

watch(revealSentinel, observeSentinel, { flush: 'post' })
watch(
  [() => props.note, () => props.resetKey],
  resetVisibleTodos,
)

onMounted(() => {
  supportsIntersectionObserver.value = typeof IntersectionObserver !== 'undefined'
  if (!supportsIntersectionObserver.value) return

  observer = new IntersectionObserver((entries) => {
    if (!isObserverArmed || !entries.some(entry => entry.isIntersecting)) return

    revealMoreTodos()
    if (hasMoreTodos.value) waitForNextScroll()
    else observer?.disconnect()
  }, { root: null })
  observeSentinel()
})

onBeforeUnmount(() => {
  stopWaitingForScroll()
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <article
    class="note-card"
    data-testid="note-card"
  >
    <header class="note-card__header">
      <h2>{{ note.title }}</h2>

      <div
        v-if="note.categories.length > 0"
        class="note-card__categories"
        aria-label="Категории"
      >
        <span
          v-for="category in note.categories"
          :key="category.toLowerCase()"
          class="note-card__category"
          data-testid="note-category"
        >
          {{ category }}
        </span>
      </div>
    </header>

    <div class="note-card__progress">
      <div class="note-card__progress-copy">
        <span>Прогресс</span>
        <span data-testid="note-progress-text">
          {{ completedTodoCount }} из {{ note.todos.length }} выполнено
        </span>
      </div>
      <progress
        class="note-card__progress-bar"
        data-testid="note-progress"
        :max="progressMaximum"
        :value="completedTodoCount"
        :aria-label="`Выполнено ${completedTodoCount} из ${note.todos.length} задач`"
      />
    </div>

    <p
      v-if="note.todos.length === 0"
      class="note-card__empty"
    >
      Нет задач
    </p>

    <template v-else>
      <ul
        class="note-card__todos"
        data-testid="note-card-todos"
      >
        <li
          v-for="todo in visibleTodos"
          :key="todo.id"
          class="note-card__todo"
          data-testid="note-card-todo"
        >
          <span
            class="note-card__todo-state"
            :class="{ 'note-card__todo-state--completed': todo.completed }"
          >
            {{ todo.completed ? 'Выполнено' : 'Не выполнено' }}
          </span>
          <span
            class="note-card__todo-text"
            :class="{ 'note-card__todo-text--completed': todo.completed }"
          >
            {{ todo.text }}
          </span>
        </li>
      </ul>

      <p
        v-if="hasMoreTodos"
        class="note-card__truncated"
      >
        Показано {{ visibleTodos.length }} из {{ note.todos.length }}
      </p>

      <div
        v-if="hasMoreTodos && supportsIntersectionObserver"
        ref="revealSentinel"
        class="note-card__sentinel"
        data-testid="todo-reveal-sentinel"
        aria-hidden="true"
      />
      <button
        v-else-if="hasMoreTodos"
        class="note-card__reveal-button"
        data-testid="todo-reveal-more"
        type="button"
        @click="revealMoreTodos"
      >
        Показать ещё
      </button>
    </template>

    <footer class="note-card__actions">
      <NuxtLink
        class="note-card__edit"
        data-testid="note-edit"
        :to="`/notes/${note.id}`"
        :aria-label="`Редактировать заметку ${note.title}`"
      >
        Редактировать
      </NuxtLink>
      <button
        class="note-card__delete"
        data-testid="note-delete"
        type="button"
        :aria-label="`Удалить заметку ${note.title}`"
        @click="emit('request-delete', note.id)"
      >
        Удалить
      </button>
    </footer>
  </article>
</template>

<style scoped lang="scss">
.note-card {
  display: grid;
  min-width: 0;
  gap: 18px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
  box-shadow: 0 8px 24px rgb(15 23 42 / 4%);
  overflow-anchor: none;
}

.note-card__header {
  display: grid;
  min-width: 0;
  gap: 12px;
}

.note-card h2 {
  margin: 0;
  color: var(--color-heading);
  font-size: 1.375rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.note-card__categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.note-card__category {
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
  font-size: 0.8125rem;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.note-card__progress {
  display: grid;
  gap: 8px;
}

.note-card__progress-copy {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  color: var(--color-muted);
  font-size: 0.875rem;
}

.note-card__progress-bar {
  width: 100%;
  height: 8px;
  border: 0;
  border-radius: 999px;
  overflow: hidden;
  background: var(--color-border);
}

.note-card__progress-bar::-webkit-progress-bar {
  border-radius: 999px;
  background: var(--color-border);
}

.note-card__progress-bar::-webkit-progress-value {
  border-radius: 999px;
  background: var(--color-primary);
}

.note-card__progress-bar::-moz-progress-bar {
  border-radius: 999px;
  background: var(--color-primary);
}

.note-card__empty,
.note-card__truncated {
  margin: 0;
  color: var(--color-subtle);
}

.note-card__todos {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.note-card__todo {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 10px;
}

.note-card__todo-state {
  padding: 3px 7px;
  border-radius: 6px;
  background: var(--color-neutral-muted);
  color: var(--color-muted);
  font-size: 0.75rem;
  font-weight: 650;
}

.note-card__todo-state--completed {
  background: var(--color-success-soft);
  color: var(--color-success-text);
}

.note-card__todo-text {
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.note-card__todo-text--completed {
  color: var(--color-subtle);
  text-decoration: line-through;
}

.note-card__truncated {
  font-size: 0.875rem;
}

.note-card__sentinel {
  width: 100%;
  height: 1px;
}

.note-card__reveal-button {
  width: fit-content;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid var(--color-control-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-control-text);
  cursor: pointer;
  font-weight: 650;
}

.note-card__reveal-button:hover {
  background: var(--color-neutral-soft);
}

.note-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: auto;
}

.note-card__edit,
.note-card__delete {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 650;
  text-decoration: none;
}

.note-card__edit {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: var(--color-surface);
}

.note-card__delete {
  border: 1px solid var(--color-control-border);
  background: var(--color-surface);
  color: var(--color-danger);
}

.note-card__edit:hover {
  border-color: var(--color-primary-hover);
  background: var(--color-primary-hover);
}

.note-card__delete:hover {
  background: var(--color-danger-soft);
}

.note-card__edit:focus-visible,
.note-card__delete:focus-visible,
.note-card__reveal-button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 480px) {
  .note-card {
    padding: 18px;
  }

  .note-card__actions > * {
    flex: 1 1 100%;
  }
}
</style>
