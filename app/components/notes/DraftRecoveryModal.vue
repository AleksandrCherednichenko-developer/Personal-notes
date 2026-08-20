<script setup lang="ts">
import BaseModal from '../modal/BaseModal.vue'

interface Props {
  open: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  discard: []
  restore: []
}>()
</script>

<template>
  <BaseModal
    description="Выберите, продолжить несохранённое редактирование или открыть последнюю сохранённую версию."
    :open="open"
    title="Найден несохранённый черновик"
  >
    <template #actions>
      <button
        class="draft-recovery__button"
        data-modal-initial-focus
        data-testid="draft-restore"
        type="button"
        @click="emit('restore')"
      >
        Восстановить
      </button>
      <button
        class="draft-recovery__button draft-recovery__button--discard"
        data-testid="draft-discard"
        type="button"
        @click="emit('discard')"
      >
        Удалить черновик
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.draft-recovery__button {
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid var(--color-primary);
  border-radius: 10px;
  background: var(--color-primary);
  color: var(--color-surface);
  cursor: pointer;
  font-weight: 650;
}

.draft-recovery__button--discard {
  border-color: var(--color-danger);
  background: var(--color-surface);
  color: var(--color-danger);
}

.draft-recovery__button:hover {
  border-color: var(--color-primary-hover);
  background: var(--color-primary-hover);
}

.draft-recovery__button--discard:hover {
  background: var(--color-danger-soft);
}

.draft-recovery__button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 480px) {
  .draft-recovery__button {
    flex: 1 1 160px;
  }
}
</style>
