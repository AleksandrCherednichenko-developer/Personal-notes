<script setup lang="ts">
import { NOTE_SORT, SORT_ORDER } from '../../notes-list'
import type { NoteSort, NotesListState, SortOrder } from '../../notes-list'

interface Props {
  categories: readonly string[]
  search: string
  state: NotesListState
}

defineProps<Props>()

const emit = defineEmits<{
  search: [value: string]
  toggleCategory: [category: string, selected: boolean]
  updateOrder: [order: SortOrder]
  updateSort: [sort: NoteSort]
}>()

const getInput = (event: Event): HTMLInputElement | null => (
  event.target instanceof HTMLInputElement ? event.target : null
)

const getSelect = (event: Event): HTMLSelectElement | null => (
  event.target instanceof HTMLSelectElement ? event.target : null
)

const isNoteSort = (value: string): value is NoteSort => (
  Object.values(NOTE_SORT).some(sort => sort === value)
)

const isSortOrder = (value: string): value is SortOrder => (
  Object.values(SORT_ORDER).some(order => order === value)
)

const isCategorySelected = (category: string, selectedCategories: readonly string[]): boolean => (
  selectedCategories.some(selected => selected.toLowerCase() === category.toLowerCase())
)

const updateSearch = (event: Event): void => {
  const input = getInput(event)
  if (input !== null) emit('search', input.value)
}

const updateCategory = (category: string, event: Event): void => {
  const input = getInput(event)
  if (input !== null) emit('toggleCategory', category, input.checked)
}

const updateSort = (event: Event): void => {
  const select = getSelect(event)
  if (select !== null && isNoteSort(select.value)) emit('updateSort', select.value)
}

const updateOrder = (event: Event): void => {
  const select = getSelect(event)
  if (select !== null && isSortOrder(select.value)) emit('updateOrder', select.value)
}
</script>

<template>
  <section
    class="notes-controls"
    aria-label="Поиск, фильтры и сортировка"
  >
    <div class="notes-controls__search">
      <label for="notes-search">Поиск</label>
      <input
        id="notes-search"
        data-testid="notes-search"
        type="search"
        autocomplete="off"
        placeholder="Название, задача или категория"
        :value="search"
        @input="updateSearch"
      >
    </div>

    <fieldset
      v-if="categories.length > 0"
      class="notes-controls__categories"
    >
      <legend>Категории</legend>
      <label
        v-for="category in categories"
        :key="category.toLowerCase()"
        class="notes-controls__category"
      >
        <input
          type="checkbox"
          :checked="isCategorySelected(category, state.categories)"
          @change="updateCategory(category, $event)"
        >
        <span>{{ category }}</span>
      </label>
    </fieldset>

    <div class="notes-controls__sort">
      <label>
        <span>Сортировать по</span>
        <select
          data-testid="notes-sort"
          :value="state.sort"
          @change="updateSort"
        >
          <option :value="NOTE_SORT.UPDATED">Дате изменения</option>
          <option :value="NOTE_SORT.CREATED">Дате создания</option>
          <option :value="NOTE_SORT.TITLE">Названию</option>
          <option :value="NOTE_SORT.PROGRESS">Прогрессу</option>
        </select>
      </label>
      <label>
        <span>Направление</span>
        <select
          data-testid="notes-order"
          :value="state.order"
          @change="updateOrder"
        >
          <option :value="SORT_ORDER.DESC">По убыванию</option>
          <option :value="SORT_ORDER.ASC">По возрастанию</option>
        </select>
      </label>
    </div>
  </section>
</template>

<style scoped lang="scss">
.notes-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px 24px;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  margin-bottom: 24px;
  background: var(--color-surface);
}

.notes-controls__search {
  grid-column: 1 / -1;
}

.notes-controls__search,
.notes-controls__sort label {
  display: grid;
  gap: 7px;
  color: var(--color-heading);
  font-weight: 700;
}

.notes-controls input[type='search'],
.notes-controls select {
  width: 100%;
  min-height: 44px;
  padding: 9px 12px;
  border: 1px solid var(--color-control-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-heading);
}

.notes-controls input:focus-visible,
.notes-controls select:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.notes-controls__categories {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-content: start;
  gap: 8px;
  padding: 0;
  border: 0;
  margin: 0;
}

.notes-controls__categories legend {
  width: 100%;
  margin-bottom: 4px;
  color: var(--color-heading);
  font-weight: 700;
}

.notes-controls__category {
  display: inline-flex;
  max-width: 100%;
  min-width: 0;
  min-height: 40px;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  border: 1px solid var(--color-control-border);
  border-radius: 999px;
  cursor: pointer;
}

.notes-controls__category span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.notes-controls__category:has(input:checked) {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
}

.notes-controls__sort {
  display: grid;
  grid-template-columns: repeat(2, minmax(150px, 1fr));
  gap: 12px;
}

@media (max-width: 760px) {
  .notes-controls {
    grid-template-columns: 1fr;
  }

  .notes-controls__sort {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .notes-controls__sort {
    grid-template-columns: 1fr;
  }
}
</style>
