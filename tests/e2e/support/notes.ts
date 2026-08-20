import type { Page } from '@playwright/test'

export const NOTES_STORAGE_KEY = 'notes-app:v1:notes'
export const DRAFTS_STORAGE_KEY = 'notes-app:v1:drafts'

export interface TestTodo {
  id: string
  text: string
  completed: boolean
}

export interface TestNote {
  id: string
  title: string
  todos: TestTodo[]
  categories: string[]
  createdAt: string
  updatedAt: string
}

export const makeNote = (
  overrides: Partial<TestNote> = {},
): TestNote => ({
  id: 'note-1',
  title: 'Планы на неделю',
  todos: [{ id: 'todo-1', text: 'Подготовить отчёт', completed: false }],
  categories: ['Работа'],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  ...overrides,
})

export const seedNotes = async (page: Page, notes: readonly TestNote[]): Promise<void> => {
  await page.goto('/')
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, value)
  }, {
    key: NOTES_STORAGE_KEY,
    value: JSON.stringify({ schemaVersion: 1, notes }),
  })
}

export const readNotes = (page: Page): Promise<TestNote[]> => page.evaluate((key) => {
  const serialized = localStorage.getItem(key)
  if (serialized === null) return []
  return (JSON.parse(serialized) as { notes: TestNote[] }).notes
}, NOTES_STORAGE_KEY)
