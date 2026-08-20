export const NOTE_SORT = {
  CREATED: 'created',
  PROGRESS: 'progress',
  TITLE: 'title',
  UPDATED: 'updated',
} as const

export type NoteSort = (typeof NOTE_SORT)[keyof typeof NOTE_SORT]

export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const

export type SortOrder = (typeof SORT_ORDER)[keyof typeof SORT_ORDER]

export interface NotesListState {
  query: string
  categories: string[]
  sort: NoteSort
  order: SortOrder
}

export const DEFAULT_NOTES_LIST_STATE: Readonly<NotesListState> = {
  query: '',
  categories: [],
  sort: NOTE_SORT.UPDATED,
  order: SORT_ORDER.DESC,
}
