<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

interface Props {
  description?: string | undefined
  open: boolean
  title: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

interface BlockedElement {
  element: HTMLElement
  wasInert: boolean
}

const dialog = ref<HTMLElement | null>(null)
const modalRoot = ref<HTMLElement | null>(null)
const componentId = useId()
const titleId = `modal-title-${componentId}`
const descriptionId = `modal-description-${componentId}`

let activationId = 0
let blockedElements: BlockedElement[] = []
let previousBodyOverflow: string | null = null
let returnFocusTo: HTMLElement | null = null

const getFocusableElements = (): HTMLElement[] => {
  if (!dialog.value) {
    return []
  }

  return Array.from(dialog.value.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      !element.matches(':disabled') &&
      !element.closest('[hidden], [aria-hidden="true"], [inert]'),
  )
}

const blockBackground = (): void => {
  if (blockedElements.length > 0 || !modalRoot.value) {
    return
  }

  blockedElements = Array.from(document.body.children)
    .filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== modalRoot.value,
    )
    .map((element) => ({ element, wasInert: element.inert }))

  for (const { element } of blockedElements) {
    element.inert = true
  }

  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

const restoreBackground = (): void => {
  for (const { element, wasInert } of blockedElements) {
    element.inert = wasInert
  }

  blockedElements = []

  if (previousBodyOverflow !== null) {
    document.body.style.overflow = previousBodyOverflow
    previousBodyOverflow = null
  }
}

const focusInitialElement = (): void => {
  const markedElement = dialog.value?.querySelector<HTMLElement>('[data-modal-initial-focus]')
  const target = markedElement ?? getFocusableElements()[0] ?? dialog.value

  target?.focus()
}

const activate = async (): Promise<void> => {
  const currentActivation = ++activationId
  const activeElement = document.activeElement

  returnFocusTo = activeElement instanceof HTMLElement ? activeElement : null

  await nextTick()

  if (!props.open || currentActivation !== activationId) {
    return
  }

  blockBackground()
  focusInitialElement()
}

const deactivate = async (): Promise<void> => {
  const currentActivation = ++activationId
  restoreBackground()

  const focusTarget = returnFocusTo
  returnFocusTo = null

  await nextTick()

  if (!props.open && currentActivation === activationId && focusTarget?.isConnected) {
    focusTarget.focus()
  }
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }

  if (event.key !== 'Tab') {
    return
  }

  const focusableElements = getFocusableElements()

  if (focusableElements.length === 0) {
    event.preventDefault()
    dialog.value?.focus()
    return
  }

  const firstElement = focusableElements[0]
  const lastElement = focusableElements.at(-1)

  if (!firstElement || !lastElement) {
    return
  }

  const activeElement = document.activeElement
  const focusIsOutsideDialog =
    activeElement instanceof Node && !dialog.value?.contains(activeElement)

  if (focusIsOutsideDialog) {
    event.preventDefault()
    const boundaryElement = event.shiftKey ? lastElement : firstElement
    boundaryElement.focus()
    return
  }

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault()
    lastElement.focus()
    return
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault()
    firstElement.focus()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void activate()
      return
    }

    void deactivate()
  },
)

onMounted(() => {
  if (props.open) {
    void activate()
  }
})

onBeforeUnmount(() => {
  activationId += 1
  restoreBackground()

  if (returnFocusTo?.isConnected) {
    returnFocusTo.focus()
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="modalRoot"
      class="modal-backdrop"
      data-modal-root
    >
      <section
        ref="dialog"
        class="modal-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="description ? descriptionId : undefined"
        tabindex="-1"
        @keydown="handleKeydown"
      >
        <header class="modal-dialog__header">
          <h2
            :id="titleId"
            class="modal-dialog__title"
          >
            {{ title }}
          </h2>
        </header>

        <div class="modal-dialog__body">
          <p
            v-if="description"
            :id="descriptionId"
            class="modal-dialog__description"
          >
            {{ description }}
          </p>

          <slot />
        </div>

        <footer
          v-if="$slots.actions"
          class="modal-dialog__actions"
        >
          <slot name="actions" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.modal-backdrop {
  position: fixed;
  z-index: 1000;
  display: grid;
  padding: 20px;
  background: rgb(15 23 42 / 48%);
  inset: 0;
  place-items: center;
}

.modal-dialog {
  width: min(100%, 480px);
  max-height: calc(100vh - 40px);
  padding: 24px;
  overflow-y: auto;
  border: 1px solid var(--color-modal-border);
  border-radius: 20px;
  background: var(--color-surface);
  box-shadow: 0 24px 60px rgb(15 23 42 / 20%);
  color: var(--color-text);
}

.modal-dialog:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.modal-dialog__header,
.modal-dialog__body,
.modal-dialog__actions {
  margin: 0;
}

.modal-dialog__title {
  margin: 0;
  color: var(--color-heading);
  font-size: 1.25rem;
  line-height: 1.4;
}

.modal-dialog__body {
  margin-top: 12px;
  line-height: 1.6;
}

.modal-dialog__description {
  margin: 0;
}

.modal-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 480px) {
  .modal-backdrop {
    align-items: end;
    padding: 12px;
  }

  .modal-dialog {
    padding: 20px;
  }
}
</style>
