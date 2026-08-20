import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Ref } from 'vue'

import { normalizeCategories } from '../domain'
import {
  parseNotesListQuery,
  selectNotes,
  serializeNotesListQuery,
} from '../notes-list'
import type { Note } from '../domain'
import type { NoteSort, NotesListState, SortOrder } from '../notes-list'

const SEARCH_DEBOUNCE_MS = 200

export const useNotesListState = (notes: Readonly<Ref<readonly Note[]>>) => {
  const route = useRoute()
  const router = useRouter()
  const routeState = computed(() => parseNotesListQuery(route.query))
  const navigationState = ref<NotesListState>(routeState.value)
  const searchInput = ref(routeState.value.query)
  const appliedSearchQuery = ref(routeState.value.query)
  const effectiveState = computed<NotesListState>(() => ({
    ...routeState.value,
    query: appliedSearchQuery.value,
  }))
  const visibleNotes = computed(() => selectNotes(notes.value, effectiveState.value))
  const resetKey = computed(() => JSON.stringify(effectiveState.value))
  const categoryOptions = computed(() => normalizeCategories([
    ...notes.value.flatMap(note => note.categories),
    ...routeState.value.categories,
  ]))

  let searchTimer: ReturnType<typeof setTimeout> | null = null

  const navigateToState = (state: NotesListState, replace = false): void => {
    navigationState.value = state
    const location = { query: serializeNotesListQuery(state) }
    if (replace) void router.replace(location)
    else void router.push(location)
  }

  const updateSearch = (value: string): void => {
    searchInput.value = value
    if (searchTimer !== null) clearTimeout(searchTimer)

    searchTimer = setTimeout(() => {
      appliedSearchQuery.value = value.trim()
      navigateToState({ ...navigationState.value, query: value }, true)
      searchTimer = null
    }, SEARCH_DEBOUNCE_MS)
  }

  const toggleCategory = (category: string, selected: boolean): void => {
    const categories = selected
      ? normalizeCategories([...navigationState.value.categories, category])
      : navigationState.value.categories.filter(
          selectedCategory => selectedCategory.toLowerCase() !== category.toLowerCase(),
        )

    navigateToState({ ...navigationState.value, categories })
  }

  const updateSort = (sort: NoteSort): void => {
    navigateToState({ ...navigationState.value, sort })
  }

  const updateOrder = (order: SortOrder): void => {
    navigateToState({ ...navigationState.value, order })
  }

  watch(
    () => routeState.value.query,
    (query) => {
      searchInput.value = query
      appliedSearchQuery.value = query
    },
  )

  watch(routeState, (state) => {
    navigationState.value = state
  })

  onBeforeUnmount(() => {
    if (searchTimer !== null) clearTimeout(searchTimer)
  })

  return {
    categoryOptions,
    resetKey,
    searchInput,
    state: routeState,
    visibleNotes,
    toggleCategory,
    updateOrder,
    updateSearch,
    updateSort,
  }
}
