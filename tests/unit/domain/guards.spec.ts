import { describe, expect, it } from 'vitest'

import {
  PERSISTED_SCHEMA_VERSION,
  isDraftEnvelope,
  isNote,
  isPersistedNotesEnvelope,
} from '../../../app/domain'

const validNote = {
  id: 'note-1',
  title: 'Планы',
  todos: [{ id: 'todo-1', text: 'Купить билеты', completed: false }],
  categories: ['Личное'],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T01:00:00.000Z',
}

describe('external data guards', () => {
  it('accepts a valid note and persisted envelope', () => {
    expect(isNote(validNote)).toBe(true)
    expect(isPersistedNotesEnvelope({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [validNote],
    })).toBe(true)
  })

  it('accepts an empty persisted collection', () => {
    expect(isPersistedNotesEnvelope({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      notes: [],
    })).toBe(true)
  })

  it.each([
    null,
    {},
    { schemaVersion: 2, notes: [] },
    { schemaVersion: PERSISTED_SCHEMA_VERSION, notes: 'broken' },
    { schemaVersion: PERSISTED_SCHEMA_VERSION, notes: [{ ...validNote, title: ' ' }] },
    { schemaVersion: PERSISTED_SCHEMA_VERSION, notes: [{ ...validNote, createdAt: 'yesterday' }] },
    { schemaVersion: PERSISTED_SCHEMA_VERSION, notes: [{ ...validNote, todos: [{}] }] },
  ])('rejects corrupted or unsupported persisted data: %j', (value) => {
    expect(isPersistedNotesEnvelope(value)).toBe(false)
  })

  it('validates a generic draft envelope using the provided item guard', () => {
    interface TestDraft {
      noteId: string
    }

    const isTestDraft = (value: unknown): value is TestDraft => (
      typeof value === 'object'
      && value !== null
      && 'noteId' in value
      && typeof value.noteId === 'string'
    )

    expect(isDraftEnvelope({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      drafts: [{ noteId: 'note-1' }],
    }, isTestDraft)).toBe(true)
    expect(isDraftEnvelope({
      schemaVersion: PERSISTED_SCHEMA_VERSION,
      drafts: [{ noteId: 1 }],
    }, isTestDraft)).toBe(false)
    expect(isDraftEnvelope({ schemaVersion: 999, drafts: [] }, isTestDraft)).toBe(false)
  })
})
