<script setup lang="ts">
import { computed } from 'vue'

import { STORAGE_WARNING_CODE } from '../../persistence/notes-storage'
import type { StorageWarning, StorageWarningCode } from '../../persistence/notes-storage'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  warning: StorageWarning | null
}>()

const WARNING_MESSAGE: Record<StorageWarningCode, string> = {
  [STORAGE_WARNING_CODE.CORRUPTED_DATA]: 'Не удалось прочитать сохранённые данные. Текущая коллекция оставлена без изменений.',
  [STORAGE_WARNING_CODE.READ_FAILED]: 'Хранилище недоступно для чтения. Изменения временно хранятся только в этой вкладке.',
  [STORAGE_WARNING_CODE.UNAVAILABLE]: 'Хранилище браузера недоступно. Изменения временно хранятся только в этой вкладке.',
  [STORAGE_WARNING_CODE.UNSUPPORTED_VERSION]: 'Версия сохранённых данных не поддерживается. Текущая коллекция оставлена без изменений.',
  [STORAGE_WARNING_CODE.WRITE_FAILED]: 'Не удалось записать данные в браузер. Изменения сохранены только в памяти этой вкладки.',
}

const message = computed(() => (
  props.warning === null ? null : WARNING_MESSAGE[props.warning.code]
))
</script>

<template>
  <p
    v-if="message"
    v-bind="$attrs"
    class="storage-warning"
    aria-live="polite"
    data-testid="storage-warning"
    role="status"
  >
    {{ message }}
  </p>
</template>

<style scoped lang="scss">
.storage-warning {
  width: min(100%, 1180px);
  padding: 12px 16px;
  border: 1px solid var(--color-warning);
  border-radius: 12px;
  margin: 0 auto 20px;
  background: var(--color-warning-soft);
  color: var(--color-warning-text);
  line-height: 1.5;
}
</style>
