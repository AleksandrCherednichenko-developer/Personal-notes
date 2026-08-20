<script setup lang="ts">
import { computed, ref } from 'vue'

import ConfirmModal from '../components/modal/ConfirmModal.vue'
import StorageWarningBanner from '../components/storage/StorageWarningBanner.vue'
import NoteCard from '../components/notes/NoteCard.vue'
import NotesListControls from '../components/notes/NotesListControls.vue'
import { useNotesListState } from '../composables/useNotesListState'
import { useNotesStorageSync } from '../composables/useNotesStorageSync'
import { vMasonryItem } from '../layout/masonry'
import { useNotesStore } from '../stores/notes'

interface PendingDelete {
  id: string
  title: string
}

const notesStore = useNotesStore()
const pendingDelete = ref<PendingDelete | null>(null)

if (!notesStore.isLoaded) notesStore.loadNotes()

const {
  categoryOptions,
  resetKey: listResetKey,
  searchInput,
  state: listState,
  visibleNotes,
  toggleCategory,
  updateOrder,
  updateSearch,
  updateSort,
} = useNotesListState(computed(() => notesStore.notes))

useNotesStorageSync()
useHead({ title: 'Мои заметки' })

const requestDelete = (noteId: string): void => {
  const note = notesStore.notes.find(currentNote => currentNote.id === noteId)
  if (note === undefined) return

  pendingDelete.value = { id: note.id, title: note.title }
}

const confirmDelete = (): void => {
  if (pendingDelete.value === null) return

  notesStore.deleteNote(pendingDelete.value.id)
  pendingDelete.value = null
}
</script>

<template>
  <main
    id="app-main"
    class="notes-page"
    tabindex="-1"
  >
    <StorageWarningBanner :warning="notesStore.storageWarning" />
    <header class="notes-page__header">
      <h1>Мои заметки</h1>

      <NuxtLink
        class="notes-page__create"
        data-testid="create-note"
        to="/notes/new"
      >
        Создать заметку
      </NuxtLink>
    </header>

    <NotesListControls
      v-if="notesStore.notes.length > 0"
      :categories="categoryOptions"
      :search="searchInput"
      :state="listState"
      @search="updateSearch"
      @toggle-category="toggleCategory"
      @update-order="updateOrder"
      @update-sort="updateSort"
    />

    <section
      v-if="notesStore.notes.length === 0"
      class="notes-page__empty"
      aria-labelledby="empty-notes-title"
    >
      <h2 id="empty-notes-title">
        Заметок пока нет
      </h2>
      <p>Создайте первую заметку, чтобы сохранить идеи и список задач.</p>
      <NuxtLink to="/notes/new">
        Создать первую заметку
      </NuxtLink>
    </section>

    <section
      v-else-if="visibleNotes.length > 0"
      class="notes-page__list"
      aria-label="Сохранённые заметки"
    >
      <NoteCard
        v-for="note in visibleNotes"
        :key="note.id"
        v-masonry-item
        :note="note"
        :reset-key="listResetKey"
        @request-delete="requestDelete"
      />
    </section>

    <section
      v-else
      class="notes-page__empty"
      aria-labelledby="no-results-title"
    >
      <h2 id="no-results-title">
        Ничего не найдено
      </h2>
      <p>Измените поисковый запрос или выбранные категории.</p>
    </section>

    <ConfirmModal
      cancel-label="Оставить"
      confirm-label="Удалить"
      :description="pendingDelete
        ? `Заметка «${pendingDelete.title}» будет удалена без возможности восстановления.`
        : undefined"
      destructive
      :open="pendingDelete !== null"
      title="Удалить заметку?"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />
  </main>
</template>

<style scoped lang="scss">
.notes-page {
  width: min(100%, 1180px);
  min-height: 100vh;
  padding: clamp(20px, 4vw, 48px);
  margin: 0 auto;
}

.notes-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.notes-page h1 {
  margin: 0;
  color: var(--color-heading);
  font-size: clamp(2rem, 5vw, 3.25rem);
  line-height: 1.1;
}

.notes-page__create,
.notes-page__empty a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 10px;
  background: var(--color-primary);
  color: var(--color-surface);
  font-weight: 650;
  text-decoration: none;
}

.notes-page__create:hover,
.notes-page__empty a:hover {
  background: var(--color-primary-hover);
}

.notes-page__create:focus-visible,
.notes-page__empty a:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.notes-page__empty {
  padding: clamp(28px, 7vw, 56px);
  border: 1px dashed var(--color-control-border);
  border-radius: 18px;
  background: var(--color-surface);
  text-align: center;
}

.notes-page__empty h2 {
  margin: 0;
  color: var(--color-heading);
  font-size: 1.5rem;
}

.notes-page__empty p {
  margin: 12px auto 22px;
  color: var(--color-subtle);
  line-height: 1.6;
}

.notes-page__list {
  --masonry-gap: 20px;
  --masonry-row-height: 8px;

  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-flow: row;
  grid-auto-rows: var(--masonry-row-height);
  align-items: start;
  column-gap: var(--masonry-gap);
  row-gap: var(--masonry-gap);
}

@media (max-width: 900px) {
  .notes-page__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .notes-page__list {
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
  }

  .notes-page__list :deep(.note-card) {
    grid-row-end: auto !important;
  }
}

@media (max-width: 600px) {
  .notes-page__header {
    align-items: stretch;
    flex-direction: column;
  }

  .notes-page__create {
    width: 100%;
  }
}
</style>
