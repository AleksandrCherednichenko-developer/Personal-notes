<script setup lang="ts">
import BaseModal from './BaseModal.vue'

interface Props {
  cancelLabel?: string
  confirmLabel?: string
  description?: string | undefined
  destructive?: boolean
  open: boolean
  title: string
}

withDefaults(defineProps<Props>(), {
  cancelLabel: 'Отмена',
  confirmLabel: 'Подтвердить',
  description: undefined,
  destructive: false,
})

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<template>
  <BaseModal
    :description="description"
    :open="open"
    :title="title"
    @close="emit('cancel')"
  >
    <slot />

    <template #actions>
      <button
        class="confirm-modal__button confirm-modal__button--cancel"
        data-modal-initial-focus
        data-testid="modal-cancel"
        type="button"
        @click="emit('cancel')"
      >
        {{ cancelLabel }}
      </button>

      <button
        class="confirm-modal__button"
        :class="{ 'confirm-modal__button--destructive': destructive }"
        data-testid="modal-confirm"
        type="button"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.confirm-modal__button {
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid var(--color-primary);
  border-radius: 10px;
  background: var(--color-primary);
  color: var(--color-surface);
  cursor: pointer;
  font-weight: 650;
}

.confirm-modal__button--cancel {
  border-color: var(--color-control-border-muted);
  background: var(--color-surface);
  color: var(--color-control-muted);
}

.confirm-modal__button--destructive {
  border-color: var(--color-danger);
  background: var(--color-danger);
}

.confirm-modal__button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.confirm-modal__button:hover {
  border-color: var(--color-primary-hover);
  background: var(--color-primary-hover);
}

.confirm-modal__button--cancel:hover {
  border-color: var(--color-control-border-hover);
  background: var(--color-control-hover);
}

.confirm-modal__button--destructive:hover {
  border-color: var(--color-danger-hover);
  background: var(--color-danger-hover);
}

@media (max-width: 480px) {
  .confirm-modal__button {
    flex: 1 1 140px;
  }
}
</style>
