import { describe, expect, it } from 'vitest'

import { normalizeCategories, normalizeRequiredText } from '../../../app/domain'

describe('domain normalization', () => {
  it('trims required text', () => {
    expect(normalizeRequiredText('  Текст заметки\n')).toBe('Текст заметки')
  })

  it('removes empty and case-insensitive duplicate categories', () => {
    expect(normalizeCategories([
      ' Работа ',
      'работа',
      '',
      '   ',
      'Личное',
      'ЛИЧНОЕ',
    ])).toEqual(['Работа', 'Личное'])
  })

  it('preserves the display casing of the first category occurrence', () => {
    expect(normalizeCategories(['tYpEsCrIpT', 'typescript'])).toEqual(['tYpEsCrIpT'])
  })
})
