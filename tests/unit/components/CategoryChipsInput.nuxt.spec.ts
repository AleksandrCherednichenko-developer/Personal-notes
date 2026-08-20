import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'

import CategoryChipsInput from '../../../app/components/notes/CategoryChipsInput.vue'

describe('CategoryChipsInput', () => {
  it('adds normalized free categories by Enter and comma', async () => {
    const wrapper = await mountSuspended(CategoryChipsInput, {
      props: {
        categories: [],
        suggestions: ['Работа'],
      },
    })
    const input = wrapper.get<HTMLInputElement>('[data-testid="category-input"]')

    await input.setValue('  Новая категория  ')
    await input.trigger('keydown', { key: 'Enter' })
    await input.setValue('Дом')
    await input.trigger('keydown', { key: ',' })

    expect(wrapper.emitted('add')).toEqual([
      ['Новая категория'],
      ['Дом'],
    ])
    expect(input.element.value).toBe('')
  })

  it('does not add empty or case-insensitive duplicate categories', async () => {
    const wrapper = await mountSuspended(CategoryChipsInput, {
      props: {
        categories: ['Работа'],
        suggestions: [],
      },
    })
    const input = wrapper.get<HTMLInputElement>('[data-testid="category-input"]')

    await input.setValue('   ')
    await input.trigger('keydown', { key: 'Enter' })
    await input.setValue('работа')
    await input.trigger('keydown', { key: ',' })

    expect(wrapper.emitted('add')).toBeUndefined()
  })

  it('removes a chip by its button and the last chip by Backspace', async () => {
    const wrapper = await mountSuspended(CategoryChipsInput, {
      props: {
        categories: ['Работа', 'Дом'],
        suggestions: [],
      },
    })

    await wrapper.get('[data-testid="category-remove-Работа"]').trigger('click')
    await wrapper.get('[data-testid="category-input"]').trigger('keydown', {
      key: 'Backspace',
    })

    expect(wrapper.emitted('remove')).toEqual([
      ['Работа'],
      ['Дом'],
    ])
  })

  it('offers saved categories without restricting free input', async () => {
    const wrapper = await mountSuspended(CategoryChipsInput, {
      props: {
        categories: [],
        suggestions: ['Работа', 'Дом'],
      },
    })
    const input = wrapper.get<HTMLInputElement>('[data-testid="category-input"]')
    const listId = input.attributes('list')

    expect(wrapper.get('label').text()).toContain('Категории')
    expect(listId).toBeTruthy()
    expect(wrapper.findAll(`#${listId} option`).map(option => option.attributes('value'))).toEqual([
      'Работа',
      'Дом',
    ])
    expect(input.attributes('aria-describedby')).toBeTruthy()
    expect(wrapper.get(`#${input.attributes('aria-describedby')}`).text()).toContain('Enter')
  })
})
