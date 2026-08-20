<script setup lang="ts">
import BaseModal from '../modal/BaseModal.vue'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  exit: []
  saveAsNew: []
}>()
</script>

<template>
  <BaseModal
    description="Текущая рабочая копия сохранена как черновик. Создайте из неё новую заметку или выйдите без восстановления удалённой заметки."
    :open="open"
    title="Заметка удалена в другой вкладке"
  >
    <template #actions>
      <button
        class="external-deletion__button"
        data-modal-initial-focus
        data-testid="conflict-save-as-new"
        type="button"
        @click="emit('saveAsNew')"
      >
        Сохранить как новую
      </button>
      <button
        class="external-deletion__button external-deletion__button--exit"
        data-testid="conflict-exit"
        type="button"
        @click="emit('exit')"
      >
        Выйти
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.external-deletion__button {
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid var(--color-primary);
  border-radius: 10px;
  background: var(--color-primary);
  color: var(--color-surface);
  cursor: pointer;
  font-weight: 650;
}

.external-deletion__button--exit {
  border-color: var(--color-control-border-muted);
  background: var(--color-surface);
  color: var(--color-control-muted);
}

.external-deletion__button:hover {
  border-color: var(--color-primary-hover);
  background: var(--color-primary-hover);
}

.external-deletion__button--exit:hover {
  border-color: var(--color-control-border-hover);
  background: var(--color-control-hover);
}

.external-deletion__button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 480px) {
  .external-deletion__button {
    flex: 1 1 170px;
  }
}
</style>
