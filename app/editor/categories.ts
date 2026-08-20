import { normalizeCategories } from '../domain'
import type { Category, Note } from '../domain'

const getComparisonKey = (category: Category): string => category.toLowerCase()

export const normalizeCategoryCandidate = (
  value: string,
  selectedCategories: readonly Category[],
): Category | null => {
  const normalizedCategory = normalizeCategories([value])[0]
  if (normalizedCategory === undefined) return null

  const candidateKey = getComparisonKey(normalizedCategory)
  const isAlreadySelected = selectedCategories.some(
    category => getComparisonKey(category) === candidateKey,
  )

  return isAlreadySelected ? null : normalizedCategory
}

export const getCategorySuggestions = (
  notes: readonly Note[],
  selectedCategories: readonly Category[],
): Category[] => {
  const savedCategories = normalizeCategories(notes.flatMap(note => note.categories))
  const selectedKeys = new Set(selectedCategories.map(getComparisonKey))

  return savedCategories.filter(category => !selectedKeys.has(getComparisonKey(category)))
}
