import { describe, expect, it } from 'vitest'

import { createNote, createTodo } from '../../../app/domain'

describe('domain factories', () => {
  it('creates todos with unique IDs, trimmed text and default state', () => {
    const firstTodo = createTodo('  Купить молоко  ')
    const secondTodo = createTodo('Позвонить врачу')

    expect(firstTodo).toEqual({
      id: expect.any(String),
      text: 'Купить молоко',
      completed: false,
    })
    expect(firstTodo.id).not.toBe(secondTodo.id)
  })

  it('creates notes with unique IDs and ISO timestamps', () => {
    const firstNote = createNote({ title: '  Рабочие задачи  ' })
    const secondNote = createNote({ title: 'Личное' })

    expect(firstNote.id).not.toBe(secondNote.id)
    expect(new Date(firstNote.createdAt).toISOString()).toBe(firstNote.createdAt)
    expect(firstNote.updatedAt).toBe(firstNote.createdAt)
    expect(firstNote).toMatchObject({
      title: 'Рабочие задачи',
      todos: [],
      categories: [],
    })
  })

  it('normalizes nested todo text and categories when creating a note', () => {
    const note = createNote({
      title: 'Планы',
      todos: [{ id: 'todo-1', text: '  Забронировать билеты ', completed: true }],
      categories: [' Путешествия ', 'путешествия', ''],
    })

    expect(note.todos[0]?.text).toBe('Забронировать билеты')
    expect(note.categories).toEqual(['Путешествия'])
  })

  it('rejects empty required text', () => {
    expect(() => createTodo('  ')).toThrow(TypeError)
    expect(() => createNote({ title: '\n\t' })).toThrow(TypeError)
    expect(() => createNote({
      title: 'Планы',
      todos: [{ id: 'todo-1', text: ' ', completed: false }],
    })).toThrow(TypeError)
  })
})
