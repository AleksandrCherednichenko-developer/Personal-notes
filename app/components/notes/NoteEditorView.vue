<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import ConfirmModal from '../modal/ConfirmModal.vue'
import StorageWarningBanner from '../storage/StorageWarningBanner.vue'
import DraftRecoveryModal from './DraftRecoveryModal.vue'
import ExternalDeletionModal from './ExternalDeletionModal.vue'
import NoteEditorForm from './NoteEditorForm.vue'
import { useEditorHistoryShortcuts } from '../../composables/useEditorHistoryShortcuts'
import { useNotesStorageSync } from '../../composables/useNotesStorageSync'
import { getCategorySuggestions } from '../../editor/categories'
import { useEditorStore } from '../../editor'
import { useNotesStore } from '../../stores/notes'

interface Props {
  noteId?: string | undefined
}

const CONFIRM_ACTION = {
  CANCEL: 'cancel',
  DELETE: 'delete',
} as const

type ConfirmAction = (typeof CONFIRM_ACTION)[keyof typeof CONFIRM_ACTION]

const props = defineProps<Props>()
const router = useRouter()
const notesStore = useNotesStore()
const editorStore = useEditorStore()
const {
  availableDraft,
  canRedo,
  canUndo,
  hasExternalDeletionConflict,
  storageWarning,
  validationIssues,
  workingNote,
} = storeToRefs(editorStore)

const isNotFound = ref(false)
const confirmAction = ref<ConfirmAction | null>(null)
const isExistingNote = computed(() => props.noteId !== undefined)
const categorySuggestions = computed(() => getCategorySuggestions(
  notesStore.notes,
  workingNote.value?.categories ?? [],
))
const pageTitle = computed(() => isExistingNote.value ? 'Редактирование заметки' : 'Новая заметка')
const documentTitle = computed(() => isNotFound.value ? 'Заметка не найдена' : pageTitle.value)
const confirmTitle = computed(() => (
  confirmAction.value === CONFIRM_ACTION.DELETE
    ? 'Удалить заметку?'
    : 'Отменить редактирование?'
))
const confirmDescription = computed(() => (
  confirmAction.value === CONFIRM_ACTION.DELETE
    ? 'Заметка будет удалена без возможности восстановления.'
    : 'Все несохранённые изменения будут потеряны.'
))
const confirmLabel = computed(() => (
  confirmAction.value === CONFIRM_ACTION.DELETE ? 'Удалить' : 'Отменить редактирование'
))
const historyShortcutsEnabled = computed(() => (
  workingNote.value !== null
  && !isNotFound.value
  && availableDraft.value === null
  && !hasExternalDeletionConflict.value
))
const visibleStorageWarning = computed(() => notesStore.storageWarning ?? storageWarning.value)

useNotesStorageSync(notes => editorStore.handleExternalNotes(notes))
useHead({ title: documentTitle })

useEditorHistoryShortcuts({
  canRedo,
  canUndo,
  enabled: historyShortcutsEnabled,
  redo: () => editorStore.redo(),
  undo: () => editorStore.undo(),
})

const initializeEditor = (noteId: string | undefined): void => {
  if (!notesStore.isLoaded) {
    notesStore.loadNotes()
  }

  if (noteId === undefined) {
    editorStore.startNewSession()
    isNotFound.value = false
    return
  }

  isNotFound.value = !editorStore.startExistingSession(noteId)
}

const navigateHome = (): void => {
  void router.push('/')
}

const save = (): void => {
  if (editorStore.saveSession() !== null) {
    navigateHome()
  }
}

const saveConflictAsNew = (): void => {
  if (editorStore.saveExternalDeletionConflictAsNew() !== null) navigateHome()
}

const exitConflict = (): void => {
  editorStore.exitExternalDeletionConflict()
  navigateHome()
}

const confirmPendingAction = (): void => {
  const action = confirmAction.value
  confirmAction.value = null

  if (action === CONFIRM_ACTION.CANCEL) {
    editorStore.cancelSession()
    navigateHome()
  }
  else if (action === CONFIRM_ACTION.DELETE) {
    editorStore.deleteSession()
    navigateHome()
  }
}

watch(
  () => props.noteId,
  noteId => initializeEditor(noteId),
  { immediate: true },
)
</script>

<template>
  <main
    id="app-main"
    class="note-editor-page"
    tabindex="-1"
  >
    <StorageWarningBanner :warning="visibleStorageWarning" />
    <section
      v-if="isNotFound"
      class="note-editor-page__state"
      aria-labelledby="note-not-found-title"
    >
      <p class="note-editor-page__status">
        Ошибка 404
      </p>
      <h1 id="note-not-found-title">
        Заметка не найдена
      </h1>
      <p>Возможно, она была удалена или адрес указан неверно.</p>
      <NuxtLink
        class="note-editor-page__home-link"
        to="/"
      >
        Вернуться к заметкам
      </NuxtLink>
    </section>

    <section
      v-else-if="workingNote"
      class="note-editor-page__card"
      aria-labelledby="note-editor-title"
    >
      <header class="note-editor-page__header">
        <h1 id="note-editor-title">
          {{ pageTitle }}
        </h1>
      </header>

      <NoteEditorForm
        :can-redo="canRedo"
        :can-delete="isExistingNote"
        :can-undo="canUndo"
        :category-suggestions="categorySuggestions"
        :note="workingNote"
        :validation-issues="validationIssues"
        @add-todo="editorStore.addTodo()"
        @add-category="editorStore.addCategory($event)"
        @commit-text-change="editorStore.commitTextChange()"
        @remove-todo="editorStore.removeTodo($event)"
        @remove-category="editorStore.removeCategory($event)"
        @request-cancel="confirmAction = CONFIRM_ACTION.CANCEL"
        @request-delete="confirmAction = CONFIRM_ACTION.DELETE"
        @redo="editorStore.redo()"
        @save="save"
        @update-title="editorStore.setTitle($event)"
        @update-todo-completed="editorStore.setTodoCompleted"
        @update-todo-text="editorStore.setTodoText"
        @undo="editorStore.undo()"
      />
    </section>

    <ConfirmModal
      :confirm-label="confirmLabel"
      :description="confirmDescription"
      :destructive="confirmAction === CONFIRM_ACTION.DELETE"
      :open="confirmAction !== null"
      :title="confirmTitle"
      @cancel="confirmAction = null"
      @confirm="confirmPendingAction"
    />

    <DraftRecoveryModal
      :open="availableDraft !== null"
      @discard="editorStore.discardDraft()"
      @restore="editorStore.restoreDraft()"
    />

    <ExternalDeletionModal
      :open="hasExternalDeletionConflict && availableDraft === null"
      @exit="exitConflict"
      @save-as-new="saveConflictAsNew"
    />
  </main>
</template>

<style scoped lang="scss">
.note-editor-page {
  min-height: 100vh;
  padding: clamp(16px, 4vw, 48px);
}

.note-editor-page__card,
.note-editor-page__state {
  width: min(100%, 860px);
  padding: clamp(22px, 5vw, 42px);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  margin: 0 auto;
  background: var(--color-surface);
  box-shadow: 0 12px 36px rgb(15 23 42 / 5%);
}

.note-editor-page__header {
  margin-bottom: 32px;
}

.note-editor-page__status {
  margin: 0 0 8px;
  color: var(--color-primary);
  font-size: 0.875rem;
  font-weight: 750;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.note-editor-page h1 {
  margin: 0;
  color: var(--color-heading);
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  line-height: 1.15;
}

.note-editor-page__state p:not(.note-editor-page__status) {
  margin: 16px 0 24px;
  color: var(--color-muted);
  line-height: 1.6;
}

.note-editor-page__home-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  padding: 10px 16px;
  border-radius: 10px;
  background: var(--color-primary);
  color: var(--color-surface);
  font-weight: 650;
  text-decoration: none;
}

.note-editor-page__home-link:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.note-editor-page__home-link:hover {
  background: var(--color-primary-hover);
}
</style>
