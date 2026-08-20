import type { Category } from './types'

export const normalizeRequiredText = (value: string): string => value.trim()

export const normalizeCategories = (categories: readonly Category[]): Category[] => {
  const normalizedCategories: Category[] = []
  const seenCategories = new Set<string>()

  for (const category of categories) {
    const normalizedCategory = category.trim()
    const comparisonKey = normalizedCategory.toLowerCase()

    if (normalizedCategory === '' || seenCategories.has(comparisonKey)) {
      continue
    }

    seenCategories.add(comparisonKey)
    normalizedCategories.push(normalizedCategory)
  }

  return normalizedCategories
}
