import { describe, expect, it } from 'vitest'

import {
  getCategorySuggestions,
  normalizeCategoryCandidate,
} from '../../../app/editor/categories'
import type { Note } from '../../../app/domain'

const createNote = (id: string, categories: string[]): Note => ({
  id,
  title: `Заметка ${id}`,
  todos: [],
  categories,
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
})

describe('category editor helpers', () => {
  it('normalizes a free category and rejects empty or case-insensitive duplicates', () => {
    expect(normalizeCategoryCandidate('  Работа  ', [])).toBe('Работа')
    expect(normalizeCategoryCandidate('   ', [])).toBeNull()
    expect(normalizeCategoryCandidate('работа', ['Работа'])).toBeNull()
  })

  it('collects unique saved categories and excludes categories already selected', () => {
    const notes = [
      createNote('1', ['Работа', 'Личное']),
      createNote('2', ['работа', ' Дом ']),
    ]

    expect(getCategorySuggestions(notes, ['личное'])).toEqual(['Работа', 'Дом'])
  })
})
