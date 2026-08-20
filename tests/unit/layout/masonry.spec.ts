import { describe, expect, it } from 'vitest'

import { calculateMasonryRowSpan } from '../../../app/layout/masonry'

describe('masonry layout', () => {
  it.each([
    { height: 0, expected: 1 },
    { height: 8, expected: 1 },
    { height: 9, expected: 2 },
    { height: 300, expected: 12 },
  ])('uses enough grid rows for a $height px card', ({ height, expected }) => {
    expect(calculateMasonryRowSpan(height, 8, 20)).toBe(expected)
  })

  it('uses the CSS grid defaults when layout metrics are omitted', () => {
    expect(calculateMasonryRowSpan(300)).toBe(12)
  })
})
