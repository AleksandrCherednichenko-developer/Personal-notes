<script setup lang="ts">
import { ref, useId } from 'vue'

import { normalizeCategoryCandidate } from '../../editor/categories'

interface Props {
  categories: readonly string[]
  suggestions: readonly string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  add: [category: string]
  remove: [category: string]
}>()

const componentId = useId()
const inputId = `category-input-${componentId}`
const suggestionsId = `category-suggestions-${componentId}`
const hintId = `category-hint-${componentId}`
const inputValue = ref('')

const addCurrentValue = (): void => {
  const category = normalizeCategoryCandidate(inputValue.value, props.categories)
  if (category === null) return

  emit('add', category)
  inputValue.value = ''
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addCurrentValue()
    return
  }

  if (
    event.key === 'Backspace'
    && inputValue.value === ''
    && props.categories.length > 0
  ) {
    event.preventDefault()
    const lastCategory = props.categories.at(-1)
    if (lastCategory !== undefined) emit('remove', lastCategory)
  }
}
</script>

<template>
  <div class="category-input">
    <label
      class="category-input__label"
      :for="inputId"
    >
      Категории
    </label>

    <input
      :id="inputId"
      v-model="inputValue"
      class="category-input__input"
      data-testid="category-input"
      type="text"
      autocomplete="off"
      :aria-describedby="hintId"
      :list="suggestionsId"
      placeholder="Введите категорию и нажмите Enter"
      @keydown="handleKeydown"
    >
    <datalist :id="suggestionsId">
      <option
        v-for="suggestion in suggestions"
        :key="suggestion.toLowerCase()"
        :value="suggestion"
      />
    </datalist>
    <p
      :id="hintId"
      class="category-input__hint"
    >
      Добавьте категорию клавишей Enter или запятой. Backspace удаляет последнюю.
    </p>
    
    <div
      v-if="categories.length > 0"
      class="category-input__chips"
      aria-label="Выбранные категории"
    >
      <span
        v-for="category in categories"
        :key="category.toLowerCase()"
        class="category-input__chip"
      >
        <span>{{ category }}</span>
        <button
          class="category-input__remove"
          :data-testid="`category-remove-${category}`"
          type="button"
          :aria-label="`Удалить категорию ${category}`"
          @click="emit('remove', category)"
        >
          ×
        </button>
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.category-input {
  display: grid;
  gap: 10px;
}

.category-input__label {
  color: var(--color-heading);
  font-weight: 700;
}

.category-input__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-input__chip {
  display: inline-flex;
  max-width: 100%;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  padding-left: 12px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary-text);
  font-size: 0.875rem;
  font-weight: 650;
}

.category-input__chip > span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.category-input__remove {
  display: grid;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  margin-left: 2px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  flex: 0 0 auto;
  font-size: 1.25rem;
  place-items: center;
}

.category-input__remove:hover {
  background: var(--color-primary-soft-hover);
}

.category-input__remove:focus-visible,
.category-input__input:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.category-input__input {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--color-control-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-heading);
}

.category-input__hint {
  margin: 0;
  color: var(--color-subtle);
  font-size: 0.875rem;
}
</style>
