import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import BaseModal from '../../../app/components/modal/BaseModal.vue'
import ConfirmModal from '../../../app/components/modal/ConfirmModal.vue'

const settleTeleport = async (): Promise<void> => {
  await nextTick()
  await nextTick()
}

const getDialog = (): HTMLElement => {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')

  if (!dialog) {
    throw new Error('Expected an open dialog')
  }

  return dialog
}

describe('BaseModal', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('associates the dialog with its visible title and description', async () => {
    const wrapper = await mountSuspended(BaseModal, {
      props: {
        description: 'Это действие нельзя отменить.',
        open: true,
        title: 'Удалить заметку?',
      },
    })

    await settleTeleport()

    const dialog = getDialog()
    const titleId = dialog.getAttribute('aria-labelledby')
    const descriptionId = dialog.getAttribute('aria-describedby')

    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(titleId).toBeTruthy()
    expect(descriptionId).toBeTruthy()
    expect(document.getElementById(titleId ?? '')?.textContent).toBe('Удалить заметку?')
    expect(document.getElementById(descriptionId ?? '')?.textContent).toBe(
      'Это действие нельзя отменить.',
    )

    wrapper.unmount()
  })

  it('focuses the explicitly marked safe action when opened', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()

    const wrapper = await mountSuspended(ConfirmModal, {
      props: {
        confirmLabel: 'Удалить',
        destructive: true,
        open: false,
        title: 'Удалить заметку?',
      },
    })

    await wrapper.setProps({ open: true })
    await settleTeleport()

    const cancelButton = document.querySelector<HTMLButtonElement>(
      '[data-modal-initial-focus]',
    )

    expect(cancelButton?.textContent).toContain('Отмена')
    expect(document.activeElement).toBe(cancelButton)

    wrapper.unmount()
  })

  it('loops focus forward and backward inside the dialog', async () => {
    const wrapper = await mountSuspended(BaseModal, {
      props: {
        open: true,
        title: 'Проверка фокуса',
      },
      slots: {
        actions:
          '<button data-testid="first">Первое</button><button data-testid="last">Последнее</button>',
      },
    })

    await settleTeleport()

    const dialog = getDialog()
    const first = document.querySelector<HTMLButtonElement>('[data-testid="first"]')
    const last = document.querySelector<HTMLButtonElement>('[data-testid="last"]')

    expect(first).not.toBeNull()
    expect(last).not.toBeNull()

    last?.focus()
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }))
    expect(document.activeElement).toBe(first)

    first?.focus()
    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Tab', shiftKey: true }),
    )
    expect(document.activeElement).toBe(last)

    wrapper.unmount()
  })

  it('emits close on Escape and restores focus after the parent closes it', async () => {
    const opener = document.createElement('button')
    opener.textContent = 'Открыть'
    document.body.append(opener)
    opener.focus()

    const wrapper = await mountSuspended(BaseModal, {
      props: {
        open: true,
        title: 'Подтвердите действие',
      },
    })

    await settleTeleport()

    getDialog().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(1)

    await wrapper.setProps({ open: false })
    await settleTeleport()

    expect(document.activeElement).toBe(opener)

    wrapper.unmount()
  })

  it('blocks the background and scroll while open, then restores prior state', async () => {
    const background = document.createElement('main')
    const alreadyInert = document.createElement('aside')
    alreadyInert.inert = true
    document.body.append(background, alreadyInert)
    document.body.style.overflow = 'clip'

    const wrapper = await mountSuspended(BaseModal, {
      props: {
        open: true,
        title: 'Модальное окно',
      },
    })

    await settleTeleport()

    expect(background.inert).toBe(true)
    expect(alreadyInert.inert).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')

    await wrapper.setProps({ open: false })
    await settleTeleport()

    expect(background.inert).toBe(false)
    expect(alreadyInert.inert).toBe(true)
    expect(document.body.style.overflow).toBe('clip')

    wrapper.unmount()
  })

  it('restores background state when unmounted while open', async () => {
    const background = document.createElement('main')
    document.body.append(background)

    const wrapper = await mountSuspended(BaseModal, {
      props: {
        open: true,
        title: 'Модальное окно',
      },
    })

    await settleTeleport()
    expect(background.inert).toBe(true)

    wrapper.unmount()

    expect(background.inert).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })
})

describe('ConfirmModal', () => {
  it('exposes separate confirm and cancel outcomes', async () => {
    const wrapper = await mountSuspended(ConfirmModal, {
      props: {
        open: true,
        title: 'Сохранить изменения?',
      },
    })

    await settleTeleport()

    document.querySelector<HTMLButtonElement>('[data-testid="modal-confirm"]')?.click()
    document.querySelector<HTMLButtonElement>('[data-testid="modal-cancel"]')?.click()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toHaveLength(1)

    wrapper.unmount()
  })
})
