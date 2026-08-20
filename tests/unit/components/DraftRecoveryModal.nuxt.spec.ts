import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import DraftRecoveryModal from '../../../app/components/notes/DraftRecoveryModal.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('DraftRecoveryModal', () => {
  it('requires an explicit restore or discard choice', async () => {
    const wrapper = await mountSuspended(DraftRecoveryModal, {
      attachTo: document.body,
      props: { open: true },
    })
    await nextTick()

    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'Найден несохранённый черновик',
    )
    expect(document.activeElement?.getAttribute('data-testid')).toBe('draft-restore')

    document.querySelector<HTMLElement>('[role="dialog"]')?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    )
    await nextTick()

    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(wrapper.emitted('restore')).toBeUndefined()
    expect(wrapper.emitted('discard')).toBeUndefined()

    document.querySelector<HTMLButtonElement>('[data-testid="draft-restore"]')?.click()
    document.querySelector<HTMLButtonElement>('[data-testid="draft-discard"]')?.click()

    expect(wrapper.emitted('restore')).toHaveLength(1)
    expect(wrapper.emitted('discard')).toHaveLength(1)
    wrapper.unmount()
  })
})
