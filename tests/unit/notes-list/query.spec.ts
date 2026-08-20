import { describe, expect, it } from 'vitest'

import {
  DEFAULT_NOTES_LIST_STATE,
  NOTE_SORT,
  SORT_ORDER,
  parseNotesListQuery,
  serializeNotesListQuery,
} from '../../../app/notes-list'

describe('notes list query', () => {
  it('parses search, repeated categories, sort and order', () => {
    expect(parseNotesListQuery({
      q: '  отчёт  ',
      category: ['Работа', 'личное'],
      sort: 'title',
      order: 'asc',
    })).toEqual({
      query: 'отчёт',
      categories: ['Работа', 'личное'],
      sort: NOTE_SORT.TITLE,
      order: SORT_ORDER.ASC,
    })
  })

  it('uses safe defaults for malformed and unsupported values', () => {
    expect(parseNotesListQuery({
      q: ['первый', 'второй'],
      category: ['Работа', null, '', 'работа'],
      sort: 'unknown',
      order: 'sideways',
    })).toEqual({
      ...DEFAULT_NOTES_LIST_STATE,
      categories: ['Работа'],
    })
  })

  it('serializes repeated categories and omits default values', () => {
    expect(serializeNotesListQuery({
      query: '  планы ',
      categories: ['Работа', 'Личное'],
      sort: NOTE_SORT.UPDATED,
      order: SORT_ORDER.DESC,
    })).toEqual({
      q: 'планы',
      category: ['Работа', 'Личное'],
    })
  })

  it('serializes non-default sorting values', () => {
    expect(serializeNotesListQuery({
      ...DEFAULT_NOTES_LIST_STATE,
      sort: NOTE_SORT.PROGRESS,
      order: SORT_ORDER.ASC,
    })).toEqual({ sort: 'progress', order: 'asc' })
  })
})
